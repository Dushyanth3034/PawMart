import React from 'react';
import GlassCard from './GlassCard.jsx';
import PremiumButton from './PremiumButton.jsx';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 flex items-center justify-center min-h-[50vh]">
          <GlassCard className="max-w-md p-8 text-center border-red-100 bg-red-50/10">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500 text-2xl font-bold">
              ⚠️
            </div>
            <h3 className="text-xl font-bold text-secondary mb-2">Something went wrong</h3>
            <p className="text-muted text-sm mb-6">
              An unexpected error occurred while rendering this dashboard section.
            </p>
            <PremiumButton 
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              variant="secondary"
              className="w-full"
            >
              Reload Page
            </PremiumButton>
          </GlassCard>
        </div>
      );
    }

    return this.props.children;
  }
}
