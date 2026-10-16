function getErrorText(value) {
  return typeof value === "string" ? value : "";
}

export function getSupabaseErrorInfo(error) {
  if (error && typeof error === "object") {
    return {
      message: getErrorText(error.message) ||
        (error instanceof Error ? error.message : "Supabase returned an unrecognized error."),
      code: getErrorText(error.code),
      details: getErrorText(error.details),
      hint: getErrorText(error.hint),
      status: typeof error.status === "number" ? error.status : undefined
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      code: "",
      details: "",
      hint: "",
      status: undefined
    };
  }

  return {
    message: getErrorText(error) || "Supabase returned an unrecognized error.",
    code: "",
    details: "",
    hint: "",
    status: undefined
  };
}

export function isSupabaseSchemaError(error) {
  const info = getSupabaseErrorInfo(error);
  const message = info.message.toLowerCase();
  const code = info.code.toUpperCase();

  return (
    ["42P01", "42703", "PGRST204", "PGRST205"].includes(code) ||
    message.includes("does not exist") ||
    message.includes("could not find the table") ||
    message.includes("could not find the") ||
    message.includes("relation") && message.includes("does not exist")
  );
}

export function getSafeSupabaseQueryMessage(error, resourceName) {
  const info = getSupabaseErrorInfo(error);
  const message = info.message.toLowerCase();
  const code = info.code.toUpperCase();

  if (code === "PGRST301" || info.status === 401 || message.includes("jwt expired") || message.includes("invalid jwt")) {
    return `Your Supabase sign-in session could not be verified. Sign in again to load ${resourceName}.`;
  }

  if (
    code === "42501" ||
    info.status === 403 ||
    message.includes("row-level security") ||
    message.includes("permission denied")
  ) {
    return `Access to ${resourceName} was denied. Check the Supabase sign-in session and Row Level Security policies.`;
  }

  if (isSupabaseSchemaError(error)) {
    return `The Supabase ${resourceName} schema is missing or out of date. Apply the client booking management migration and verify the table and column names.`;
  }

  if (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("fetch failed") ||
    info.status === 0
  ) {
    return `Could not connect to Supabase to load ${resourceName}. Check your connection and Supabase URL configuration, then try again.`;
  }

  return `Could not load ${resourceName}. Try again. If the problem continues, check the browser console for the Supabase error code.`;
}

export function logSupabaseQueryError(context, error) {
  if (!import.meta.env.DEV) return;

  const info = getSupabaseErrorInfo(error);
  console.error(context, {
    message: info.message,
    code: info.code || undefined,
    details: info.details || undefined,
    hint: info.hint || undefined,
    status: info.status,
    originalError: error
  });
}
