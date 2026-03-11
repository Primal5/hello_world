import { useUiStore } from '../store/uiStore';

export function InteractionPrompt(): JSX.Element | null {
  const prompt = useUiStore((state) => state.interactionPrompt);
  if (!prompt) return null;

  return <div className="interaction-prompt">{prompt}</div>;
}
