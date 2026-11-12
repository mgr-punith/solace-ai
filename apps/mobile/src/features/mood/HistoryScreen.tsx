import { ProgressSummary } from '../progress/ProgressSummary';
import { PageHeader } from '../../components/ui/layout';
import { Screen } from '../../components/ui/Screen';
import { DailyQuestionsCard } from '../questionnaire/DailyQuestionsCard';
import { RecentCheckins } from './RecentCheckins';

export function HistoryScreen() {
  return (
    <Screen inTabs>
      <PageHeader title="Your progress" />
      <ProgressSummary />
      <DailyQuestionsCard compact />
      <RecentCheckins />
    </Screen>
  );
}
