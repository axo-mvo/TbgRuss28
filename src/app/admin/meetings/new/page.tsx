import { getNextMeetingTitle } from '@/lib/actions/meeting'
import NewMeetingForm from './NewMeetingForm'

export default async function NewMeetingPage() {
  const defaultTitle = await getNextMeetingTitle()
  return <NewMeetingForm defaultTitle={defaultTitle} />
}
