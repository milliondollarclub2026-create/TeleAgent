import { Toaster as Sonner, toast } from "sonner"

const Toaster = ({
  ...props
}) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-slate-900 group-[.toaster]:border group-[.toaster]:border-slate-200 group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl",
          description: "group-[.toast]:text-slate-500",
          actionButton:
            "group-[.toast]:bg-slate-900 group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-slate-100 group-[.toast]:text-slate-600",
          success:
            "group-[.toaster]:bg-white group-[.toaster]:text-slate-900 group-[.toaster]:border-emerald-200 [&>svg]:text-emerald-600",
          error:
            "group-[.toaster]:bg-white group-[.toaster]:text-slate-900 group-[.toaster]:border-red-200 [&>svg]:text-red-500",
          warning:
            "group-[.toaster]:bg-white group-[.toaster]:text-slate-900 group-[.toaster]:border-amber-200 [&>svg]:text-amber-500",
          info:
            "group-[.toaster]:bg-white group-[.toaster]:text-slate-900 group-[.toaster]:border-blue-200 [&>svg]:text-blue-500",
        },
      }}
      icons={{
        success: (
          <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ),
        error: (
          <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        ),
        warning: (
          <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01" />
            </svg>
          </div>
        ),
        info: (
          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        ),
      }}
      {...props} />
  );
}

export { Toaster, toast }
