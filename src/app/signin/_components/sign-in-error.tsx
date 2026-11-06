const ERROR_MESSAGES: Record<string, string> = {
  blocked:
    "Your account has been blocked. Contact an administrator for assistance.",
  email_not_found:
    "Discord sign-in requires a verified email address and permission to access Walls. Check your Discord account or contact an administrator.",
  access_denied: "Discord sign-in was cancelled. You can try again.",
  account_not_linked:
    "This Discord account could not be linked. Use the same verified email address as your Walls account.",
  unable_to_link_account:
    "This Discord account could not be linked. Contact an administrator for assistance.",
  unable_to_create_user:
    "Sign-up could not be completed. Check that you have an invitation if one is required.",
  unable_to_create_session:
    "Sign-in could not be completed. Contact an administrator if this continues.",
}

export function SignInError({ error }: { error?: string }) {
  if (!error) return null

  const message = Object.hasOwn(ERROR_MESSAGES, error)
    ? ERROR_MESSAGES[error]
    : "Sign-in could not be completed. Please try again."

  return (
    <div
      role="alert"
      className="w-full rounded-md border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
    >
      {message}
    </div>
  )
}
