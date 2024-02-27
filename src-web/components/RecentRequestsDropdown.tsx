import classNames from 'classnames';
import { useMemo, useRef } from 'react';
import { useKey, useKeyPressEvent } from 'react-use';
import { useActiveEnvironmentId } from '../hooks/useActiveEnvironmentId';
import { useActiveRequest } from '../hooks/useActiveRequest';
import { useActiveWorkspaceId } from '../hooks/useActiveWorkspaceId';
import { useAppRoutes } from '../hooks/useAppRoutes';
import { useGrpcRequests } from '../hooks/useGrpcRequests';
import { useHotKey } from '../hooks/useHotKey';
import { useHttpRequests } from '../hooks/useHttpRequests';
import { useRecentRequests } from '../hooks/useRecentRequests';
import { fallbackRequestName } from '../lib/fallbackRequestName';
import type { ButtonProps } from './core/Button';
import { Button } from './core/Button';
import type { DropdownItem, DropdownRef } from './core/Dropdown';
import { Dropdown } from './core/Dropdown';
import { HttpMethodTag } from './core/HttpMethodTag';

export function RecentRequestsDropdown({ className }: Pick<ButtonProps, 'className'>) {
  const dropdownRef = useRef<DropdownRef>(null);
  const activeRequest = useActiveRequest();
  const activeWorkspaceId = useActiveWorkspaceId();
  const activeEnvironmentId = useActiveEnvironmentId();
  const httpRequests = useHttpRequests();
  const grpcRequests = useGrpcRequests();
  const routes = useAppRoutes();
  const allRecentRequestIds = useRecentRequests();
  const recentRequestIds = useMemo(() => allRecentRequestIds.slice(1), [allRecentRequestIds]);
  const requests = useMemo(() => [...httpRequests, ...grpcRequests], [httpRequests, grpcRequests]);

  // Toggle the menu on Cmd+k
  useKey('k', (e) => {
    if (e.metaKey) {
      e.preventDefault();
      dropdownRef.current?.toggle();
    }
  });

  // Handle key-up
  useKeyPressEvent('Control', undefined, () => {
    if (!dropdownRef.current?.isOpen) return;
    dropdownRef.current?.select?.();
  });

  useHotKey('requestSwitcher.prev', () => {
    if (!dropdownRef.current?.isOpen) dropdownRef.current?.open();
    dropdownRef.current?.next?.();
  });

  useHotKey('requestSwitcher.next', () => {
    if (!dropdownRef.current?.isOpen) dropdownRef.current?.open();
    dropdownRef.current?.prev?.();
  });

  const items = useMemo<DropdownItem[]>(() => {
    if (activeWorkspaceId === null) return [];

    const recentRequestItems: DropdownItem[] = [];
    for (const id of recentRequestIds) {
      const request = requests.find((r) => r.id === id);
      if (request === undefined) continue;

      recentRequestItems.push({
        key: request.id,
        label: fallbackRequestName(request),
        // leftSlot: <CountBadge className="!ml-0 px-0 w-5" count={recentRequestItems.length} />,
        leftSlot: <HttpMethodTag request={request} />,
        onSelect: () => {
          routes.navigate('request', {
            requestId: request.id,
            environmentId: activeEnvironmentId ?? undefined,
            workspaceId: activeWorkspaceId,
          });
        },
      });
    }

    // No recent requests to show
    if (recentRequestItems.length === 0) {
      return [
        {
          key: 'no-recent-requests',
          label: 'No recent requests',
          disabled: true,
        },
      ];
    }

    return recentRequestItems.slice(0, 20);
  }, [activeWorkspaceId, activeEnvironmentId, recentRequestIds, requests, routes]);

  return (
    <Dropdown ref={dropdownRef} items={items}>
      <Button
        data-tauri-drag-region
        size="sm"
        className={classNames(
          className,
          'text-gray-800 text-sm truncate pointer-events-auto',
          activeRequest === null && 'text-opacity-disabled italic',
        )}
      >
        {fallbackRequestName(activeRequest)}
      </Button>
    </Dropdown>
  );
}
