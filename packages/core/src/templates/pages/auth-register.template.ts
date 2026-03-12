import { renderAlert } from '../alert.template'

export interface RegisterPageData {
  error?: string
}

export function renderRegisterPage(data: RegisterPageData): string {
  return `
    <!DOCTYPE html>
    <html lang="en" class="h-full dark">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Register - Flare CMS</title>
      <link rel="icon" type="image/svg+xml" href="/favicon.svg">
      <script src="https://unpkg.com/htmx.org@2.0.3"></script>
      <script src="https://cdn.tailwindcss.com"></script>
      <script>
        tailwind.config = {
          darkMode: 'class',
          theme: {
            extend: {
              colors: {
                flare: {
                  400: '#fb923c',
                  500: '#f6821f',
                  600: '#ea680c'
                },
                error: '#ef4444'
              }
            }
          }
        }
      </script>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

        body {
          font-family: 'Outfit', ui-sans-serif, system-ui, sans-serif;
        }

        .register-card {
          background: linear-gradient(135deg, rgba(246,130,31,0.06) 0%, rgba(24,24,27,1) 50%, rgba(34,211,238,0.04) 100%);
        }
      </style>
    </head>
    <body class="h-full bg-zinc-950">
      <!-- Dot grid background -->
      <div class="fixed inset-0 bg-[linear-gradient(rgba(246,130,31,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(246,130,31,0.03)_1px,transparent_1px)] bg-[size:64px_64px]"></div>

      <div class="relative flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8">
        <!-- Logo Section -->
        <div class="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div class="mx-auto w-64 mb-8">
            <svg class="w-full h-auto" viewBox="0 0 211.667 52.917" aria-hidden="true">
              <g>
                <path fill="#F1F2F2" d="M531.21-41.381q-1 4.894 6.023 4.894 7.093 0 7.992-4.398.478-2.34-1.63-3.83-2.106-1.49-5.38-2.483-3.201-.993-6.416-2.27-3.13-1.348-4.976-4.114-1.832-2.838-.977-7.023 3.638-17.804 26.55-17.804 8.37 0 11.974 3.192 3.69 3.12 2.544 8.725-.42 2.057-1.379 3.972-.873 1.844-1.6 2.625l-.741.85h-12.556q1.894-1.63 2.401-4.113.942-4.611-5.087-4.611-7.59 0-8.576 4.823-.492 2.412 1.63 3.831t5.352 2.27q3.317.78 6.546 1.986t5.061 4.043q1.847 2.767.934 7.236-1.841 9.008-8.13 13.406-6.276 4.327-17.484 4.327-11.207 0-14.51-3.972-2.441-2.98-1.369-8.228.406-1.987 1.31-4.327l.445-1.135h12.768l-.316.85q-.287.71-.403 1.278M489.632-77.913l2.589 24.473 21.316-24.473h13.406L507.5-26.84h-12.84l10.992-28.8-14.431 17.167h-9.293l-1.316-17.166-10.992 28.8h-12.768l19.445-51.074zM431.58-25.847q-10.143 0-13.146-4.398-2.058-3.12-.913-8.725.493-2.411 1.555-5.178l6.242-16.315q6.86-17.946 26.721-17.946 8.229 0 11.76 3.546 3.546 3.476 2.3 9.577-.58 2.837-2.011 5.674-1.346 2.767-2.402 4.115l-1.07 1.418h-12.555q2.891-2.695 3.906-7.66.536-2.625-.507-4.115-1.03-1.56-3.654-1.56-7.164 0-10.135 7.944l-5.41 14.33q-.732 1.843-1.095 3.617-.956 4.682 4.647 4.682 6.74 0 9.638-7.59h12.768l-.775 2.057q-6.214 16.527-25.863 16.527" transform="translate(-96.207 53.31)scale(.51736)"/>
                <path fill="#F1F2F2" d="M384.108-64.38q-8.915 0-15.158 3.93-6.15 3.853-8.917 11.107l-3.501 9.368a21.3 21.3 0 0 0-.967 3.249q-2.223 10.88 13.493 10.88 17.226 0 22.606-14.13l-12.51-.15q-.537 1.511-2.052 2.644-1.517 1.134-3.33 1.134-4.911 0-4.062-4.156.155-.755.491-1.662l.657-1.738h23.044l2.003-5.364q.705-1.965 1.043-3.627 2.347-11.484-12.84-11.484m-4.032 10.125q2.19 0 2.941 1.134.75 1.132.52 2.266-.216 1.058-.782 2.342h-10.2q1.268-2.87 3.299-4.306 2.106-1.436 4.222-1.436" transform="translate(-96.207 53.31)scale(.51736)"/>
                <path fill="#f6821f" d="M408.287-51.034c-1.39 3.629-5.367 6.59-9.025 6.763l-28.404.365-.531 1.412 28.496.37c1.615.075 2.958.721 3.751 1.84 1.173 2.032.1 4.685.1 4.685l-.542 1.476c-.05.176-.211.744.821.747.926.002 1.126-.51 1.205-.713l.497-1.269c1.395-3.63 5.903-6.596 9.582-6.768l6.789-.397c.32-.024.628-.253.721-.55a.8.8 0 0 0-.08-.551.55.55 0 0 0-.47-.249l-6.517-.4c-1.615-.077-2.957-.718-3.754-1.836-.87-1.222-1.066-2.861-.545-4.653l1.194-4.15c.052-.182.189-.658-.814-.659-.733 0-.971.417-1.038.59z" transform="translate(-96.207 53.31)scale(.51736)"/>
                <path fill="#F1F2F2" d="M357.672-55.54q-.525 2.57-1.926 4.987-1.325 2.418-2.388 3.551l-1.047 1.058h-11.408q2.244-1.738 2.768-4.306.278-1.36-.459-2.192-.645-.906-2.156-.906-2.57 0-4.983 2.569l-9.11 23.875H314.12l13.848-36.342h11.938l-1.941 5.062q5.557-6.12 11.677-6.12 4.91 0 6.85 2.343 2.014 2.342 1.18 6.422M295.68-64.228q-6.951 0-12.167 4.08-5.124 4.004-7.723 10.805l-3.393 8.84q-.826 2.19-1.196 4.003-2.176 10.653 10.214 10.653 7.329 0 12.342-6.044-.329 6.044 7.982 6.044 4.533 0 8.762-2.946l2.122-8.537q-1.515.755-3.554.755-1.964 0-1.563-1.965a6 6 0 0 1 .261-.906l9.094-23.8h-11.485l-.84 2.267q-1.83-3.249-8.856-3.249m.286 10.804q3.097 0 3.543 1.89l-4.86 12.692q-2.397 2.115-5.117 2.116-2.645 0-3.547-1.134-.886-1.21-.64-2.417.248-1.21.538-1.889l2.14-5.667q2.125-5.59 7.943-5.591M262.022-38.54q-.401 1.965 1.563 1.965 2.04 0 3.555-.756l-2.123 8.538q-4.228 2.946-8.761 2.946-6.876 0-8.267-3.173-.868-2.04-.374-4.457.494-2.418 1.167-4.232l17.745-46.54h12.844l-17.088 44.803q-.168.453-.26.906" transform="translate(-96.207 53.31)scale(.51736)"/>
                <path fill="#F1F2F2" d="M224.797-84.25c-1.588 0-2.718 1.262-3.463 3.22l-1.626 4.423s-13.884 35.66-21.697 57.05c0 0 8.331-4.094 16.721-4.094l7.367-20.255h21.303l4.769-12.635h-21.476l4.492-12.352h.014c.463-1.574 1.587-2.718 2.92-2.72h24.234l4.85-12.636h-31.382z" transform="translate(-96.207 53.31)scale(.51736)"/>
              </g>
            </svg>
          </div>
          <h2 class="mt-6 text-xl font-medium text-white">Create Your Account</h2>
          <p class="mt-2 text-sm text-zinc-400">Get started with Flare CMS</p>
        </div>

        <!-- Form Container -->
        <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div class="relative">
            <!-- Glow effect behind card -->
            <div class="absolute -inset-1 rounded-2xl bg-gradient-to-b from-flare-500/20 via-transparent to-cyan-500/10 blur-xl"></div>

            <div class="register-card relative rounded-xl border border-white/10 px-6 py-8 sm:px-10 shadow-2xl shadow-flare-500/5">
              <!-- Alerts -->
              ${data.error ? `<div class="mb-6">${renderAlert({ type: 'error', message: data.error })}</div>` : ''}

              <!-- Form -->
              <form
                id="register-form"
                hx-post="/auth/register/form"
                hx-target="#form-response"
                hx-swap="innerHTML"
                class="space-y-6"
              >
                <!-- First and Last Name -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label for="firstName" class="block text-sm font-medium text-zinc-300 mb-2">
                      First Name
                    </label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      required
                      class="w-full rounded-lg bg-zinc-900/80 px-3.5 py-2.5 text-sm text-white shadow-sm border border-white/10 placeholder:text-zinc-500 focus:outline-none focus:border-flare-500/50 focus:ring-1 focus:ring-flare-500/50 transition-all"
                      placeholder="First name"
                    >
                  </div>
                  <div>
                    <label for="lastName" class="block text-sm font-medium text-zinc-300 mb-2">
                      Last Name
                    </label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      required
                      class="w-full rounded-lg bg-zinc-900/80 px-3.5 py-2.5 text-sm text-white shadow-sm border border-white/10 placeholder:text-zinc-500 focus:outline-none focus:border-flare-500/50 focus:ring-1 focus:ring-flare-500/50 transition-all"
                      placeholder="Last name"
                    >
                  </div>
                </div>

                <!-- Username -->
                <div>
                  <label for="username" class="block text-sm font-medium text-zinc-300 mb-2">
                    Username
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    class="w-full rounded-lg bg-zinc-900/80 px-3.5 py-2.5 text-sm text-white shadow-sm border border-white/10 placeholder:text-zinc-500 focus:outline-none focus:border-flare-500/50 focus:ring-1 focus:ring-flare-500/50 transition-all"
                    placeholder="Choose a username"
                  >
                </div>

                <!-- Email -->
                <div>
                  <label for="email" class="block text-sm font-medium text-zinc-300 mb-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autocomplete="email"
                    required
                    class="w-full rounded-lg bg-zinc-900/80 px-3.5 py-2.5 text-sm text-white shadow-sm border border-white/10 placeholder:text-zinc-500 focus:outline-none focus:border-flare-500/50 focus:ring-1 focus:ring-flare-500/50 transition-all"
                    placeholder="Enter your email"
                  >
                </div>

                <!-- Password -->
                <div>
                  <label for="password" class="block text-sm font-medium text-zinc-300 mb-2">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autocomplete="new-password"
                    required
                    minlength="8"
                    class="w-full rounded-lg bg-zinc-900/80 px-3.5 py-2.5 text-sm text-white shadow-sm border border-white/10 placeholder:text-zinc-500 focus:outline-none focus:border-flare-500/50 focus:ring-1 focus:ring-flare-500/50 transition-all"
                    placeholder="Create a password (min. 8 characters)"
                  >
                </div>

                <!-- Submit Button -->
                <button
                  type="submit"
                  class="w-full rounded-lg bg-gradient-to-r from-flare-500 to-flare-400 px-4 py-2.5 text-sm font-semibold text-white hover:from-flare-600 hover:to-flare-500 focus:outline-none focus:ring-2 focus:ring-flare-500 focus:ring-offset-2 focus:ring-offset-zinc-950 transition-all shadow-lg shadow-flare-500/25"
                >
                  Create Account
                </button>
              </form>

              <!-- Links -->
              <div class="mt-6 text-center">
                <p class="text-sm text-zinc-400">
                  Already have an account?
                  <a href="/auth/login" class="font-semibold text-flare-400 hover:text-flare-300 transition-colors">Sign in here</a>
                </p>
              </div>

              <div id="form-response"></div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}