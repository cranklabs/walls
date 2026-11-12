"use client"

import { useState } from "react"
import { MdEdit } from "react-icons/md"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { renameFile } from "@/server/actions/renameFile"

function basename(name: string) {
  return name.split(".").slice(0, -1).join(".")
}

export function RenameFile({ id, name }: { id: number; name: string }) {
  const [open, setOpen] = useState(false)
  const [newName, setNewName] = useState(basename(name))

  const [disabled, setDisabled] = useState(false)
  async function handleDelete() {
    setDisabled(true)
    const resp = await renameFile({ id: id, basename: newName })
    if (resp.status == "success") {
      toast.success("Wallpaper renamed", { description: resp.message })
      setOpen(false)
    } else {
      toast.error("Failed to rename wallpaper", { description: resp.message })
    }
    setDisabled(false)
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="flex items-center">
          Rename
          <MdEdit />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename the wallpaper</DialogTitle>
          <DialogDescription>
            Enter a new name for the wallpaper
          </DialogDescription>
          <Input
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value)
            }}
          />
          <div className="flex gap-4 pt-4">
            <Button
              variant="secondary"
              className="flex-grow"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-grow"
              disabled={disabled}
              onClick={handleDelete}
            >
              Rename
            </Button>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
