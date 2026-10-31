import { Meta, StoryFn } from '@storybook/react';
import { AppIcon } from './AppIcon';

export default {
  title: 'shared/AppIcon',
  component: AppIcon,
  argTypes: {
    backgroundColor: { control: 'color' },
  },
} as Meta<typeof AppIcon>;

const Template: StoryFn<typeof AppIcon> = (args: any) => <AppIcon {...args} />;

export const Normal = Template.bind({});
Normal.args = {};
