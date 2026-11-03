import { HashRouter, Outlet, Route, Routes } from 'react-router-dom';
import { AppProvider } from './AppContext';
import { TabBar } from './components/TabBar';
import { UpdateBanner } from './components/UpdateBanner';
import { LessonScreen } from './screens/LessonScreen';
import { PathScreen } from './screens/PathScreen';
import { ReviewScreen } from './screens/ReviewScreen';
import { ReviewSessionScreen } from './screens/ReviewSessionScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { ShadowingPracticeScreen } from './screens/ShadowingPracticeScreen';
import { TodayScreen } from './screens/TodayScreen';
import { UnitNotesScreen } from './screens/UnitNotesScreen';

/** Layout for the tab screens: content plus the bottom tab bar. */
function TabLayout() {
  return (
    <div className="tab-layout">
      <div className="tab-layout__content">
        <Outlet />
      </div>
      <TabBar />
    </div>
  );
}

/**
 * Root component. Hash routing is used because GitHub Pages cannot rewrite
 * unknown paths to index.html.
 */
export function App() {
  return (
    <HashRouter>
      <AppProvider>
        <UpdateBanner />
        <Routes>
          <Route element={<TabLayout />}>
            <Route path="/" element={<TodayScreen />} />
            <Route path="/path" element={<PathScreen />} />
            <Route path="/review" element={<ReviewScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="/unit/:unitId/notes" element={<UnitNotesScreen />} />
          </Route>
          <Route path="/lesson/:unitId/:lessonId" element={<LessonScreen />} />
          <Route path="/review/session" element={<ReviewSessionScreen />} />
          <Route path="/practice/shadowing" element={<ShadowingPracticeScreen />} />
        </Routes>
      </AppProvider>
    </HashRouter>
  );
}
