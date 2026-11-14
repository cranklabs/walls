import { redirect } from "next/navigation"

import { getSession } from "@/server/auth"
import {
  getAllUsers,
  getAppSetting,
  getInviteList,
  getInviteRequests,
  hasPasswordCredential,
} from "@/server/db/queries"
import { _getSettings } from "@/server/settings"

import { Settings } from "./client"

export default async function Page() {
  const session = await getSession()
  const user = session?.user
  if (!user) redirect("/signin")

  const [settings, hasPassword] = await Promise.all([
    _getSettings(user.id),
    hasPasswordCredential(user.id),
  ])

  // Fetch admin data if the user is an admin
  let adminData = null
  if (user.isAdmin) {
    const [users, invites, inviteRequests, inviteOnly, guestViewing] =
      await Promise.all([
        getAllUsers(),
        getInviteList(),
        getInviteRequests(),
        getAppSetting("invite_only"),
        getAppSetting("allow_guest_viewing"),
      ])

    adminData = {
      users,
      invites,
      inviteRequests,
      inviteOnly: inviteOnly === "true",
      guestViewing: guestViewing !== "false",
    }
  }

  return (
    <Settings
      settings={settings}
      isAdmin={!!user.isAdmin}
      currentUserId={user.id}
      email={user.email}
      hasPassword={hasPassword}
      adminData={adminData}
    />
  )
}
