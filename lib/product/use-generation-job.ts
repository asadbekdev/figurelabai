"use client"

import { useEffect, useState } from "react"

import { ApiRequestError, getJson } from "@/lib/api/client"
import type { PublicGenerationJob } from "@/lib/jobs/types"

export function useGenerationJob(jobId: string | null) {
  const [snapshot, setSnapshot] = useState<{
    id: string
    job: PublicGenerationJob | null
    error: string | null
    errorCode: string | null
    retryable: boolean
  }>({ id: "", job: null, error: null, errorCode: null, retryable: false })

  useEffect(() => {
    if (!jobId) return

    let cancelled = false
    let timer: number | undefined

    const tick = async () => {
      try {
        const data = await getJson<{ job: PublicGenerationJob }>(
          `/api/generation/jobs/${jobId}`
        )
        if (cancelled) return
        setSnapshot({
          id: jobId,
          job: data.job,
          error: null,
          errorCode: null,
          retryable: false,
        })
        if (data.job.status === "queued" || data.job.status === "running") {
          timer = window.setTimeout(() => {
            void tick()
          }, 750)
        }
      } catch (caught) {
        if (cancelled) return
        setSnapshot({
          id: jobId,
          job: null,
          error:
            caught instanceof ApiRequestError
              ? caught.message
              : "The job status could not be loaded.",
          errorCode: caught instanceof ApiRequestError ? caught.code : null,
          retryable: caught instanceof ApiRequestError ? caught.retryable : true,
        })
        if (!(caught instanceof ApiRequestError) || caught.retryable) {
          timer = window.setTimeout(() => {
            void tick()
          }, 1_500)
        }
      }
    }

    void tick()
    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [jobId])

  if (!jobId) {
    return { job: null, error: null, errorCode: null, retryable: false }
  }
  if (snapshot.id !== jobId) {
    return { job: null, error: null, errorCode: null, retryable: false }
  }
  return snapshot
}

export function useGenerationJobs(jobIds: string[]) {
  const key = jobIds.join(",")
  const [snapshot, setSnapshot] = useState<{ key: string; jobs: PublicGenerationJob[] }>({
    key: "",
    jobs: [],
  })

  useEffect(() => {
    if (jobIds.length === 0) return

    let cancelled = false
    let timer: number | undefined

    const tick = async () => {
      const results = await Promise.all(
        jobIds.map(async (id) => {
          try {
            const data = await getJson<{ job: PublicGenerationJob }>(`/api/generation/jobs/${id}`)
            return data.job
          } catch {
            return null
          }
        })
      )
      if (cancelled) return
      const jobs = results.filter((job): job is PublicGenerationJob => job !== null)
      setSnapshot({ key, jobs })
      if (jobs.some((job) => job.status === "queued" || job.status === "running")) {
        timer = window.setTimeout(() => {
          void tick()
        }, 750)
      }
    }

    void tick()
    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  if (jobIds.length === 0 || snapshot.key !== key) return []
  return snapshot.jobs
}

export function formatJobElapsed(job: PublicGenerationJob | null): string {
  if (!job?.startedAt) return "0 sec"
  const end = job.completedAt ? Date.parse(job.completedAt) : Date.now()
  const seconds = Math.max(0, Math.floor((end - Date.parse(job.startedAt)) / 1000))
  return `${seconds} sec`
}
