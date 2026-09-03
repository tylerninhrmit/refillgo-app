import { Outlet } from 'react-router-dom';
import { TabBar } from './TabBar';

export function TabLayout() {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-page">
      <div className="pb-[92px]">
        <Outlet />
      </div>
      <TabBar />
    </div>
  );
}
