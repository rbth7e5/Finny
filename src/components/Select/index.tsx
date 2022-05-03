import React, { useCallback, useMemo, useState } from 'react';
import { Menu, TextInput, useTheme } from 'react-native-paper';
import { TextInputProps } from 'react-native-paper/lib/typescript/components/TextInput/TextInput';
import { ScrollView, StyleSheet } from 'react-native';
import { Theme } from 'react-native-paper/lib/typescript/types';

export type Option = {
  label: string;
  value: string;
};
export type SelectProps = {
  onSelect: (option: Option) => void;
  options: Option[];
  maxOptionsDisplayed?: number;
} & Omit<TextInputProps, 'theme'>;
const Select = ({
  options,
  onSelect,
  maxOptionsDisplayed = 4,
  ...textInputProps
}: SelectProps) => {
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

  const { menuStyle, scrollViewStyle } = useMemo(() => {
    const numOptions = hasCustomOption
      ? filteredOptions.length + 1
      : filteredOptions.length;
    const numOptionsDisplayed =
      maxOptionsDisplayed > numOptions ? numOptions : maxOptionsDisplayed + 0.5;
    const menuItemHeight = 48;
    const extraOffset = 8;
    return {
      menuStyle: {
        marginTop: -numOptionsDisplayed * menuItemHeight - extraOffset,
        left: 32,
        right: 32,
      },
      scrollViewStyle: {
        height: numOptionsDisplayed * menuItemHeight,
      },
    };
  }, [filteredOptions.length, hasCustomOption, maxOptionsDisplayed]);
  const styles = makeStyles(useTheme());

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
      <ScrollView style={scrollViewStyle}>
        {hasCustomOption && (
          <Menu.Item
            style={styles.customMenuItem}
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
      </ScrollView>
    </Menu>
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    customMenuItem: {
      backgroundColor: theme.colors.accent,
    },
  });

export default Select;
