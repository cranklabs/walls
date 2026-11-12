"use client"

import { CgSpinnerTwo } from "react-icons/cg"
import { ImCommand, ImCtrl } from "react-icons/im"
import { MdKeyboardReturn } from "react-icons/md"

import { Button } from "@/components/ui/button"
import { clientOS } from "@/lib/client"

export function UploadButton({
  onClick,
  disabled,
}: {
  onClick: () => void
  disabled: boolean
}) {
  const os = clientOS()
  return (
    <Button onClick={onClick} disabled={disabled}>
      {disabled ? <CgSpinnerTwo className="animate-spin" /> : null}
      Upload
      {os === "mac" || os === "windows" || os === "linux" ? (
        <div className="flex items-center gap-1 text-neutral-400">
          {os === "mac" ? <ImCommand /> : <ImCtrl />}
          <MdKeyboardReturn />
        </div>
      ) : null}
    </Button>
  )
}
