/**
 * Product icon barrel. ChatGPT.com ships a custom `lightweight-*` SVG sprite
 * (not a public library). Hugeicons Stroke Rounded is the closest legal public
 * match: round caps/joins, 1.5 stroke, friendlier than Phosphor Regular.
 * Import icons from this file only — do not add a second icon package.
 */
import { createElement, forwardRef, type ComponentProps } from "react"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import {
  AiChipIcon,
  Alert02Icon,
  AlertCircleIcon,
  Album01Icon,
  ArrowDown01Icon,
  ArrowExpandIcon,
  ArrowLeft02Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  ArrowUp02Icon,
  ArrowUpRight01Icon,
  AspectRatioIcon,
  BubbleChatIcon,
  Cancel01Icon,
  Chart01Icon,
  CheckmarkCircle02Icon,
  CircleIcon as CircleGlyph,
  CircleDashedIcon as CircleDashedGlyph,
  Clock01Icon,
  CommandIcon as CommandGlyph,
  Copy01Icon,
  Cursor01Icon,
  Database01Icon,
  Delete02Icon,
  Download01Icon,
  FavouriteIcon,
  File01Icon,
  FileImageIcon as FileImageGlyph,
  FileTypeIcon,
  Flowchart01Icon,
  Folder01Icon,
  FolderAddIcon,
  ImageAdd01Icon as ImageAddGlyph,
  FrameIcon as FrameGlyph,
  GridViewIcon as GridViewGlyph,
  InformationCircleIcon,
  LeftToRightListDashIcon,
  Layers01Icon,
  Link01Icon,
  Loading02Icon,
  MagicWand01Icon,
  Menu01Icon,
  MinusSignIcon as MinusSignGlyph,
  Moon02Icon,
  MoreHorizontalIcon as MoreHorizontalGlyph,
  NoteEditIcon,
  Notification03Icon,
  OctagonXIcon as OctagonXGlyph,
  PaintBoardIcon,
  PanelLeftIcon as PanelLeftGlyph,
  PencilEdit01Icon,
  PlusSignIcon,
  Redo03Icon,
  Search01Icon,
  Select01Icon,
  ShapesIcon as ShapesGlyph,
  Share08Icon,
  SlidersHorizontalIcon,
  SparklesIcon as SparklesGlyph,
  SquareLock01Icon,
  Sun03Icon,
  TextFontIcon,
  TextWrapIcon,
  Tick02Icon,
  Undo03Icon,
  UserCircleIcon,
  VectorSquareIcon as VectorSquareGlyph,
} from "@hugeicons/core-free-icons"

type ProductIconProps = Omit<ComponentProps<"svg">, "ref"> & {
  size?: string | number
  strokeWidth?: string | number
}

function createProductIcon(icon: IconSvgElement, displayName: string) {
  const ProductIcon = forwardRef<SVGSVGElement, ProductIconProps>(
    function ProductIcon(
      { size = "1em", color = "currentColor", strokeWidth = 1.5, ...props },
      ref
    ) {
      const width =
        typeof strokeWidth === "number" ? strokeWidth : Number(strokeWidth) || 1.5
      return createElement(HugeiconsIcon, {
        icon,
        size,
        color,
        strokeWidth: width,
        ref,
        ...props,
      })
    }
  )
  ProductIcon.displayName = displayName
  return ProductIcon
}

export const AlertTriangleIcon = createProductIcon(Alert02Icon, "AlertTriangleIcon")
export const ArrowLeftIcon = createProductIcon(ArrowLeft02Icon, "ArrowLeftIcon")
export const ArrowUpIcon = createProductIcon(ArrowUp02Icon, "ArrowUpIcon")
export const ArrowUpRightIcon = createProductIcon(ArrowUpRight01Icon, "ArrowUpRightIcon")
export const AspectIcon = createProductIcon(AspectRatioIcon, "AspectIcon")
export const BellIcon = createProductIcon(Notification03Icon, "BellIcon")
export const CheckCircle2Icon = createProductIcon(CheckmarkCircle02Icon, "CheckCircle2Icon")
export const ChartIcon = createProductIcon(Chart01Icon, "ChartIcon")
export const CheckIcon = createProductIcon(Tick02Icon, "CheckIcon")
export const ChevronDownIcon = createProductIcon(ArrowDown01Icon, "ChevronDownIcon")
export const ChevronRightIcon = createProductIcon(ArrowRight01Icon, "ChevronRightIcon")
export const ChevronUpIcon = createProductIcon(ArrowUp01Icon, "ChevronUpIcon")
export const ChipIcon = createProductIcon(AiChipIcon, "ChipIcon")
export const CircleAlertIcon = createProductIcon(AlertCircleIcon, "CircleAlertIcon")
export const CircleCheckIcon = createProductIcon(CheckmarkCircle02Icon, "CircleCheckIcon")
export const CircleDashedIcon = createProductIcon(CircleDashedGlyph, "CircleDashedIcon")
export const CircleIcon = createProductIcon(CircleGlyph, "CircleIcon")
export const Clock3Icon = createProductIcon(Clock01Icon, "Clock3Icon")
export const CommandIcon = createProductIcon(CommandGlyph, "CommandIcon")
export const CopyIcon = createProductIcon(Copy01Icon, "CopyIcon")
export const DatabaseIcon = createProductIcon(Database01Icon, "DatabaseIcon")
export const DownloadIcon = createProductIcon(Download01Icon, "DownloadIcon")
export const FileImageIcon = createProductIcon(FileImageGlyph, "FileImageIcon")
export const FileTextIcon = createProductIcon(File01Icon, "FileTextIcon")
export const FileType2Icon = createProductIcon(FileTypeIcon, "FileType2Icon")
export const FlowchartIcon = createProductIcon(Flowchart01Icon, "FlowchartIcon")
export const FolderIcon = createProductIcon(Folder01Icon, "FolderIcon")
export const FolderPlusIcon = createProductIcon(FolderAddIcon, "FolderPlusIcon")
export const FrameIcon = createProductIcon(FrameGlyph, "FrameIcon")
export const GridViewIcon = createProductIcon(GridViewGlyph, "GridViewIcon")
export const HeartIcon = createProductIcon(FavouriteIcon, "HeartIcon")
export const ListViewIcon = createProductIcon(LeftToRightListDashIcon, "ListViewIcon")
export const ImageAddIcon = createProductIcon(ImageAddGlyph, "ImageAddIcon")
export const ImageIcon = createProductIcon(Album01Icon, "ImageIcon")
export const LineIcon = createProductIcon(MinusSignGlyph, "LineIcon")
export const InfoIcon = createProductIcon(InformationCircleIcon, "InfoIcon")
export const Layers3Icon = createProductIcon(Layers01Icon, "Layers3Icon")
export const LinkIcon = createProductIcon(Link01Icon, "LinkIcon")
export const Loader2Icon = createProductIcon(Loading02Icon, "Loader2Icon")
export const LoaderCircleIcon = createProductIcon(Loading02Icon, "LoaderCircleIcon")
export const LockIcon = createProductIcon(SquareLock01Icon, "LockIcon")
export const Maximize2Icon = createProductIcon(ArrowExpandIcon, "Maximize2Icon")
export const MenuIcon = createProductIcon(Menu01Icon, "MenuIcon")
export const MessageSquareIcon = createProductIcon(BubbleChatIcon, "MessageSquareIcon")
export const MoonIcon = createProductIcon(Moon02Icon, "MoonIcon")
export const MoreHorizontalIcon = createProductIcon(MoreHorizontalGlyph, "MoreHorizontalIcon")
export const MousePointer2Icon = createProductIcon(Cursor01Icon, "MousePointer2Icon")
export const OctagonXIcon = createProductIcon(OctagonXGlyph, "OctagonXIcon")
export const PaletteIcon = createProductIcon(PaintBoardIcon, "PaletteIcon")
export const PanelLeftIcon = createProductIcon(PanelLeftGlyph, "PanelLeftIcon")
export const PencilIcon = createProductIcon(PencilEdit01Icon, "PencilIcon")
export const PlusIcon = createProductIcon(PlusSignIcon, "PlusIcon")
export const Redo2Icon = createProductIcon(Redo03Icon, "Redo2Icon")
export const SearchIcon = createProductIcon(Search01Icon, "SearchIcon")
export const SelectRegionIcon = createProductIcon(Select01Icon, "SelectRegionIcon")
export const Settings2Icon = createProductIcon(SlidersHorizontalIcon, "Settings2Icon")
export const ShapesIcon = createProductIcon(ShapesGlyph, "ShapesIcon")
export const Share2Icon = createProductIcon(Share08Icon, "Share2Icon")
export const SparklesIcon = createProductIcon(SparklesGlyph, "SparklesIcon")
export const SquarePenIcon = createProductIcon(NoteEditIcon, "SquarePenIcon")
export const SquareStackIcon = createProductIcon(Layers01Icon, "SquareStackIcon")
export const SunIcon = createProductIcon(Sun03Icon, "SunIcon")
export const Trash2Icon = createProductIcon(Delete02Icon, "Trash2Icon")
export const TriangleAlertIcon = createProductIcon(Alert02Icon, "TriangleAlertIcon")
export const TypeIcon = createProductIcon(TextFontIcon, "TypeIcon")
export const Undo2Icon = createProductIcon(Undo03Icon, "Undo2Icon")
export const UserRoundIcon = createProductIcon(UserCircleIcon, "UserRoundIcon")
export const VectorSquareIcon = createProductIcon(VectorSquareGlyph, "VectorSquareIcon")
export const WandSparklesIcon = createProductIcon(MagicWand01Icon, "WandSparklesIcon")
export const WrapTextIcon = createProductIcon(TextWrapIcon, "WrapTextIcon")
export const XIcon = createProductIcon(Cancel01Icon, "XIcon")
