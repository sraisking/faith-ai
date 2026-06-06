import ChatInterface from '@/components/ChatInterface';

export default function BiblePage() {
  return (
    <ChatInterface 
      title="Ask Bible" 
      themeColor="bible" 
      apiEndpoint="/api/chat/bible"
      welcomeMessage="Peace be with you. I am here to provide guidance from the Old and New Testaments. What moral or ethical question do you bring forth today?"
    />
  );
}
