import { Meta, StoryFn } from '@storybook/react';
import { VStack } from './VStack';

export default {
  title: 'shared/VStack',
  component: VStack,
  argTypes: {
    backgroundColor: { control: 'color' },
  },
} as Meta<typeof VStack>;

const Template: StoryFn<typeof VStack> = (args: any) => <VStack {...args} />;

export const Normal = Template.bind({});
Normal.args = {};
