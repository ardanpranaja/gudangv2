import { useApp } from '../context/AppContext';

export const useTheme = () => {
  const { theme, toggleTheme, setTheme } = useApp();
  return { theme, toggleTheme, setTheme };
};
