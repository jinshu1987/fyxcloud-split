import awsLogo from "@assets/aws-color_1772273692736.png";
import azureLogo from "@assets/azureai-color_1772273692735.png";
import gcpLogo from "@assets/googlecloud-color_1772273692735.png";
import hfLogo from "@assets/huggingface-color_1772273692736.png";

const providerLogos: Record<string, string> = {
  AWS: awsLogo,
  Azure: azureLogo,
  GCP: gcpLogo,
  "Hugging Face": hfLogo,
  HuggingFace: hfLogo,
};

interface ProviderIconProps {
  provider: string;
  size?: number;
  className?: string;
}

export function ProviderIcon({ provider, size = 28, className = "" }: ProviderIconProps) {
  const logo = providerLogos[provider];
  if (!logo) {
    return (
      <span className={`font-bold text-muted-foreground ${className}`} style={{ fontSize: size * 0.5 }}>
        {provider.slice(0, 2)}
      </span>
    );
  }
  return (
    <img
      src={logo}
      alt={`${provider} logo`}
      width={size}
      height={size}
      className={`object-contain ${className}`}
      draggable={false}
    />
  );
}

export { providerLogos };
