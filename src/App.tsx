import { useEffect } from 'react';
import { Router, Route, Switch, useLocation } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { TimerProvider } from '@/contexts/TimerContext';
import Setup from '@/pages/Setup';
import Timer from '@/pages/Timer';
import Summary from '@/pages/Summary';

function NotFound() {
  const [, navigate] = useLocation();
  useEffect(() => { navigate('/'); }, []);
  return null;
}

export default function App() {
  return (
    <LanguageProvider>
      <TimerProvider>
        <Router hook={useHashLocation}>
          <Switch>
            <Route path="/" component={Setup} />
            <Route path="/timer" component={Timer} />
            <Route path="/summary" component={Summary} />
            <Route component={NotFound} />
          </Switch>
        </Router>
      </TimerProvider>
    </LanguageProvider>
  );
}
