export function useCurrency() {
  return {
    formatCurrency: (n: number) => {
      try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n || 0);
      } catch (e) {
        return `$${(n || 0).toFixed(2)}`;
      }
    }
  };
}

export default useCurrency;
