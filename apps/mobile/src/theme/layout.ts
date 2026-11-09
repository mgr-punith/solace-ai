import { useWindowDimensions } from 'react-native';
import { tokens } from './tokens';

// Native window dimensions already account for display density. Never divide by scale again.
export function useLayoutMetrics() {
  const { width, height } = useWindowDimensions();
  const compact = width < tokens.layout.compactWidth || height < tokens.layout.compactHeight;
  return {
    compact,
    gutter: compact ? tokens.spacing.md : tokens.spacing.ml,
    top: compact ? tokens.spacing.smd : tokens.spacing.ml,
    gap: compact ? tokens.spacing.md : tokens.spacing.ml,
    surfacePadding: compact ? tokens.spacing.smd : tokens.spacing.md,
    surfaceGap: compact ? tokens.spacing.sm : tokens.spacing.smd,
  };
}
