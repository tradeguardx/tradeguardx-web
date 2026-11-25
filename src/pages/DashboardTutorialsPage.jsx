import TutorialsLibrary from '../components/tutorials/TutorialsLibrary';
import { sx } from '../components/dashboard/shell/sx';

/** The tutorial library inside the dashboard: same videos as /tutorials, in the dashboard's theme. */
export default function DashboardTutorialsPage() {
  return (
    <div style={sx('max-width:1100px')}>
      <header style={sx('margin-bottom:22px')}>
        <h1 style={sx("margin:0;font:600 29px/1.08 'Space Grotesk',sans-serif;letter-spacing:-.035em")}>Tutorials</h1>
        <p style={sx('margin:7px 0 0;font-size:14px;color:var(--ink-3)')}>Setup for each exchange, and the kill switch working on real accounts.</p>
      </header>
      <TutorialsLibrary tone="app" />
    </div>
  );
}
