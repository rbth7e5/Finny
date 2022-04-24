import { useEffect, useState } from 'react';
import { Keyboard, KeyboardEventListener, Platform } from 'react-native';

export default function useAdjustKeyboard() {
  const [bottom, setBottom] = useState(0);

  useEffect(() => {
    const onKeyboardChange: KeyboardEventListener = e => {
      if (
        e.startCoordinates &&
        e.startCoordinates.screenY &&
        e.endCoordinates.screenY <= e.startCoordinates.screenY
      ) {
        setBottom(e.endCoordinates.height / 2);
      } else {
        setBottom(0);
      }
    };

    if (Platform.OS === 'ios') {
      const subscription = Keyboard.addListener(
        'keyboardWillChangeFrame',
        onKeyboardChange,
      );
      return () => subscription.remove();
    }

    const subscriptions = [
      Keyboard.addListener('keyboardDidHide', onKeyboardChange),
      Keyboard.addListener('keyboardDidShow', onKeyboardChange),
    ];
    return () => subscriptions.forEach(subscription => subscription.remove());
  }, []);

  return bottom;
}
