import React, { useCallback, useMemo, useState } from 'react';
import { Menu, TextInput } from 'react-native-paper';
import { TextInputProps } from 'react-native-paper/lib/typescript/components/TextInput/TextInput';

export type Option = {
  label: string;
  value: string;
};
export type SelectProps = {
  onSelect: (option: Option) => void;
  options: Option[];
} & Omit<TextInputProps, 'theme'>;
const Select = ({ options, onSelect, ...textInputProps }: SelectProps) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [text, setText] = useState<string>();
  const onChangeText = useCallback(
    (value: string) => {
      if (!menuVisible) {
        setMenuVisible(true);
      }
      setText(value);
    },
    [menuVisible],
  );
  const onDismiss = useCallback(() => {
    setMenuVisible(false);
  }, []);
  const showMenu = useCallback(() => setMenuVisible(true), []);
  const filteredOptions = useMemo(
    () =>
      options.filter(option =>
        option.label.toLowerCase().includes(text?.toLowerCase() || ''),
      ),
    [options, text],
  );

  const hasCustomOption = useMemo(() => !!text && text !== '', [text]);

  const menuStyle = useMemo(() => {
    const numOptions = hasCustomOption
      ? filteredOptions.length + 1
      : filteredOptions.length;
    const menuItemHeight = 48;
    const extraOffset = 8;
    return {
      marginTop: -numOptions * menuItemHeight - extraOffset,
    };
  }, [filteredOptions.length, hasCustomOption]);

  return (
    <Menu
      style={menuStyle}
      visible={menuVisible}
      onDismiss={onDismiss}
      anchor={
        <TextInput
          value={text}
          onChangeText={onChangeText}
          onFocus={() => showMenu()}
          {...textInputProps}
        />
      }>
      {hasCustomOption && (
        <Menu.Item
          title={text}
          onPress={() => {
            onSelect({ label: text!, value: text! });
            onDismiss();
          }}
        />
      )}
      {filteredOptions.map(option => (
        <Menu.Item
          key={option.value}
          title={option.label}
          onPress={() => {
            setText(option.label);
            onSelect(option);
            onDismiss();
          }}
        />
      ))}
    </Menu>
  );
};

export default Select;
