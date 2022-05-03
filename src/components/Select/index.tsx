import React, { useCallback, useState } from 'react';
import { Menu, TextInput } from 'react-native-paper';

export type Option = {
  label: string;
  value: string;
};
export type SelectProps = {
  onSelect: (option: Option) => void;
  options: Option[];
};
const Select = ({ options, onSelect }: SelectProps) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [text, setText] = useState<string>();
  const onChangeText = useCallback((value: string) => setText(value), []);
  const onDismiss = useCallback(() => {
    setMenuVisible(false);
  }, []);
  return (
    <Menu
      visible={menuVisible}
      onDismiss={onDismiss}
      anchor={<TextInput value={text} onChangeText={onChangeText} />}>
      {options.map(option => (
        <Menu.Item title={option.label} onPress={() => onSelect(option)} />
      ))}
    </Menu>
  );
};

export default Select;
