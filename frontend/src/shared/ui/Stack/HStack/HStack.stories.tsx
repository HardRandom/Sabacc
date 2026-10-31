import { Meta, StoryFn } from '@storybook/react';
import { HStack } from './HStack';

export default {
  title: 'shared/HStack',
  component: HStack,
  argTypes: {
    backgroundColor: { control: 'color' },
  },
} as Meta<typeof HStack>;

const Template: StoryFn<typeof HStack> = (args: any) => <HStack {...args} />;

export const Normal = Template.bind({});
Normal.args = {};
