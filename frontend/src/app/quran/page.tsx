import ChatInterface from '@/components/ChatInterface';

export default function QuranPage() {
  return (
    <ChatInterface 
      title="Ask Quran" 
      themeColor="quran" 
      apiEndpoint="/api/chat/quran"
      welcomeMessage="As-salamu alaykum. I am here to share the profound ethical teachings of the Quran. What guidance do you seek on distinguishing right from wrong?"
    />
  );
}
