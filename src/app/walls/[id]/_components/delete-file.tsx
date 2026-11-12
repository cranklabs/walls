"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { MdDelete } from "react-icons/md"
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
import { deleteFile } from "@/server/actions/deleteFile"

export function DeleteFile({ id }: { id: number }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const [disableDelete, setDisableDelete] = useState(false)
  async function handleDelete() {
    const resp = await deleteFile(id)
    if (resp.status == "success") {
      toast.success("File deleted")
      router.push("/my-walls")
      router.refresh()
    } else {
      toast.error("Failed to delete file", { description: resp.message })
      setDisableDelete(false)
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="flex items-center">
          Delete
          <MdDelete />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you absolutely sure?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the file.
          </DialogDescription>
          <div className="flex gap-4 pt-4">
            <Button
              variant="secondary"
              className="flex-grow"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-grow"
              disabled={disableDelete}
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
