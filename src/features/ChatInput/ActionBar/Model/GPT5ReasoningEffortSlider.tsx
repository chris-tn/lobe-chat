import { type CreatedLevelSliderProps } from './createLevelSlider';
import { createLevelSliderComponent } from './createLevelSlider';

const GPT5_REASONING_EFFORT_LEVELS = ['minimal', 'low', 'medium', 'high'] as const;
type GPT5ReasoningEffort = (typeof GPT5_REASONING_EFFORT_LEVELS)[number];

export type GPT5ReasoningEffortSliderProps = CreatedLevelSliderProps<GPT5ReasoningEffort>;

const GPT5ReasoningEffortSlider = createLevelSliderComponent<GPT5ReasoningEffort>({
  configKey: 'gpt5ReasoningEffort',
  defaultValue: 'medium',
  levels: GPT5_REASONING_EFFORT_LEVELS,
  style: { minWidth: 200 },
  const gpt5ReasoningEffort = config.gpt5ReasoningEffort || 'minimal'; // Default to 'minimal' if not set

  const marks = {
    0: 'minimal',
    1: 'low',
    2: 'medium',
    3: 'high',
  };

  const effortValues = ['minimal', 'low', 'medium', 'high'];
  const indexValue = effortValues.indexOf(gpt5ReasoningEffort);
  const currentValue = indexValue === -1 ? 2 : indexValue;

  const updateGPT5ReasoningEffort = useCallback(
    (value: number) => {
      const effort = effortValues[value] as 'minimal' | 'low' | 'medium' | 'high';
      updateAgentChatConfig({ gpt5ReasoningEffort: effort });
    },
    [updateAgentChatConfig],
  );

  return (
    <Flexbox
      align={'center'}
      gap={12}
      horizontal
      paddingInline={'0 20px'}
      style={{ minWidth: 200, width: '100%' }}
    >
      <Flexbox flex={1}>
        <Slider
          marks={marks}
          max={3}
          min={0}
          onChange={updateGPT5ReasoningEffort}
          step={1}
          tooltip={{ open: false }}
          value={currentValue}
        />
      </Flexbox>
    </Flexbox>
  );
});

export default GPT5ReasoningEffortSlider;
