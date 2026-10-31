import { Meta, StoryFn } from '@storybook/react';
import { Button } from './Button';

export default {
  title: 'shared/Button',
  component: Button,
  argTypes: {
    backgroundColor: { control: 'color' },
  },
} as Meta<typeof Button>;

const Template: StoryFn<typeof Button> = (args: any) => <Button {...args} />;

export const Normal = Template.bind({});
Normal.args = {};