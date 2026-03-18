import { useToast } from "@/hooks/use-toast"
import { CheckCircle2, XCircle, Info } from "lucide-react"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

const variantIcons: Record<string, React.ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />,
  destructive: <XCircle className="h-5 w-5 text-red-400 shrink-0" />,
  info: <Info className="h-5 w-5 text-blue-400 shrink-0" />,
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const icon = variantIcons[variant || ""] || null
        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex items-start gap-3">
              {icon}
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
