export function useTranslation() {
  const t = (key: string, defaultText?: string) => defaultText || key;
  return { t };
}

export default useTranslation;
