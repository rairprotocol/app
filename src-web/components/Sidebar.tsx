import classnames from 'classnames';
import type { Identifier } from 'dnd-core';
import type { CSSProperties } from 'react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { XYCoord } from 'react-dnd';
import { DndProvider, useDrag, useDragLayer, useDrop } from 'react-dnd';
import { getEmptyImage, HTML5Backend } from 'react-dnd-html5-backend';
import { useActiveRequest } from '../hooks/useActiveRequest';
import { useCreateRequest } from '../hooks/useCreateRequest';
import { useDeleteRequest } from '../hooks/useDeleteRequest';
import { useKeyValue } from '../hooks/useKeyValue';
import { useRequests } from '../hooks/useRequests';
import { useTheme } from '../hooks/useTheme';
import { useUpdateRequest } from '../hooks/useUpdateRequest';
import { clamp } from '../lib/clamp';
import type { HttpRequest } from '../lib/models';
import { Button } from './core/Button';
import { Dropdown, DropdownMenuTrigger } from './core/Dropdown';
import { Icon } from './core/Icon';
import { IconButton } from './core/IconButton';
import { HStack, VStack } from './core/Stacks';
import { WindowDragRegion } from './core/WindowDragRegion';

interface Props {
  className?: string;
}

const MIN_WIDTH = 110;
const INITIAL_WIDTH = 200;
const MAX_WIDTH = 500;

enum ItemTypes {
  REQUEST = 'request',
}

export function Sidebar({ className }: Props) {
  return (
    <DndProvider backend={HTML5Backend}>
      <Container className={className} />
    </DndProvider>
  );
}

export function Container({ className }: Props) {
  const [isResizing, setIsRisizing] = useState<boolean>(false);
  const width = useKeyValue<number>({ key: 'sidebar_width', initialValue: INITIAL_WIDTH });
  const sidebarRef = useRef<HTMLDivElement>(null);
  const requests = useRequests();
  const activeRequest = useActiveRequest();
  const createRequest = useCreateRequest({ navigateAfter: true });
  const { appearance, toggleAppearance } = useTheme();
  const [items, setItems] = useState(requests.map((r) => ({ request: r, left: 0, top: 0 })));

  useEffect(() => {
    setItems(requests.map((r) => ({ request: r, left: 0, top: 0 })));
  }, [requests]);

  const moveState = useRef<{ move: (e: MouseEvent) => void; up: () => void } | null>(null);
  const unsub = () => {
    if (moveState.current !== null) {
      document.documentElement.removeEventListener('mousemove', moveState.current.move);
      document.documentElement.removeEventListener('mouseup', moveState.current.up);
    }
  };

  const handleResizeReset = () => {
    width.set(INITIAL_WIDTH);
  };

  const handleResizeStart = (e: React.MouseEvent<HTMLDivElement>) => {
    unsub();
    const mouseStartX = e.clientX;
    const startWidth = width.value;
    moveState.current = {
      move: (e: MouseEvent) => {
        const newWidth = clamp(startWidth + (e.clientX - mouseStartX), MIN_WIDTH, MAX_WIDTH);
        width.set(newWidth);
      },
      up: () => {
        unsub();
        setIsRisizing(false);
      },
    };
    document.documentElement.addEventListener('mousemove', moveState.current.move);
    document.documentElement.addEventListener('mouseup', moveState.current.up);
    setIsRisizing(true);
  };

  const sidebarWidth = sidebarRef.current?.clientWidth ?? 0;
  const handleMove = useCallback((dragIndex: number, hoverIndex: number) => {
    setItems((oldItems) => {
      const newItems = [...oldItems];
      const b = newItems[hoverIndex]!;
      newItems[hoverIndex] = newItems[dragIndex]!;
      newItems[dragIndex] = b;
      return newItems;
    });
  }, []);

  return (
    <div
      ref={sidebarRef}
      style={{ width: width.value }}
      className={classnames(
        className,
        'relative',
        'bg-gray-100 h-full border-r border-gray-200 relative grid grid-rows-[auto,1fr,auto]',
      )}
    >
      <CustomDragLayer sidebarWidth={sidebarWidth} />
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        aria-hidden
        className="group absolute -right-2 top-0 bottom-0 w-4 cursor-ew-resize flex justify-center"
        onMouseDown={handleResizeStart}
        onDoubleClick={handleResizeReset}
      >
        <div // drag-divider
          className={classnames(
            'transition-colors w-[1px] group-hover:bg-gray-300 h-full pointer-events-none',
            isResizing && '!bg-blue-500/70',
          )}
        />
      </div>
      <HStack as={WindowDragRegion} alignItems="center" justifyContent="end">
        <IconButton
          title="Add Request"
          className="mx-1"
          icon="plusCircle"
          onClick={async () => {
            await createRequest.mutate({ name: 'Test Request' });
          }}
        />
      </HStack>
      <VStack as="ul" className="py-3 overflow-auto h-full" space={1}>
        {items.map(({ request, top, left }, i) => (
          <DraggableSidebarItem
            index={i}
            key={request.id}
            request={request}
            active={request.id === activeRequest?.id}
            left={left}
            top={top}
            sidebarWidth={sidebarWidth}
            onMove={handleMove}
          />
        ))}
      </VStack>
      <HStack className="mx-1 pb-1" alignItems="center" justifyContent="end">
        <IconButton
          title={appearance === 'dark' ? 'Enable light mode' : 'Enable dark mode'}
          icon={appearance === 'dark' ? 'moon' : 'sun'}
          onClick={toggleAppearance}
        />
      </HStack>
    </div>
  );
}

interface SidebarItemProps {
  request: HttpRequest;
  sidebarWidth: number;
  active?: boolean;
  isDragging?: boolean;
}

function SidebarItem({ request, active, sidebarWidth, isDragging }: SidebarItemProps) {
  const deleteRequest = useDeleteRequest(request);
  const updateRequest = useUpdateRequest(request);
  const [editing, setEditing] = useState<boolean>(false);

  const handleSubmitNameEdit = async (el: HTMLInputElement) => {
    await updateRequest.mutate({ name: el.value });
    setEditing(false);
  };

  const handleFocus = (el: HTMLInputElement | null) => {
    el?.focus();
    el?.select();
  };

  return (
    <li className={classnames('block group/item px-2')} style={{ width: sidebarWidth + 'px' }}>
      <div className="relative w-full">
        <Button
          color="custom"
          size="sm"
          draggable={false} // Item should drag, not the link
          className={classnames(
            'w-full',
            editing && 'focus-within:border-blue-400/40',
            isDragging && 'bg-blue-200',
            active
              ? 'bg-gray-200/70 text-gray-900'
              : 'text-gray-600 group-hover/item:text-gray-800 active:bg-gray-200/30',

            // Move out of the way when trash is shown
            'group-hover/item:pr-7',
          )}
          onKeyDown={(e) => {
            // Hitting enter on active request during keyboard nav will start edit
            if (active && e.key === 'Enter') {
              e.preventDefault();
              setEditing(true);
            }
          }}
          to={!isDragging ? `/workspaces/${request.workspaceId}/requests/${request.id}` : undefined}
          onDoubleClick={() => setEditing(true)}
          onClick={active ? () => setEditing(true) : undefined}
          justify="start"
        >
          {editing ? (
            <input
              ref={handleFocus}
              defaultValue={request.name}
              className="bg-transparent outline-none w-full"
              onBlur={(e) => handleSubmitNameEdit(e.currentTarget)}
              onKeyDown={async (e) => {
                switch (e.key) {
                  case 'Enter':
                    await handleSubmitNameEdit(e.currentTarget);
                    break;
                  case 'Escape':
                    setEditing(false);
                    break;
                }
              }}
            />
          ) : (
            <span
              className={classnames(
                'truncate',
                !(request.name || request.url) && 'text-gray-400 italic',
              )}
            >
              {request.name || request.url || 'New Request'}
            </span>
          )}
        </Button>
        <Dropdown
          items={[
            {
              label: 'Delete Request',
              onSelect: deleteRequest.mutate,
              leftSlot: <Icon icon="trash" />,
            },
          ]}
        >
          <DropdownMenuTrigger
            className={classnames(
              'absolute right-0 top-0 transition-opacity opacity-0',
              'group-hover/item:opacity-100 focus-visible:opacity-100',
            )}
          >
            <IconButton
              color="custom"
              size="sm"
              iconSize="sm"
              title="Delete request"
              icon="dotsH"
            />
          </DropdownMenuTrigger>
        </Dropdown>
      </div>
    </li>
  );
}

type DraggableSidebarItemProps = SidebarItemProps & {
  left: number;
  top: number;
  index: number;
  onMove: (dragIndex: number, hoverIndex: number) => void;
};

type DragItem = {
  request: HttpRequest;
  index: number;
  top: number;
  left: number;
};

function getStyles(left: number, top: number, width: number): CSSProperties {
  const transform = `translate3d(${left}px, ${top}px, 0)`;
  return {
    transform,
    WebkitTransform: transform,
    width,
  };
}

function DraggableSidebarItem({
  index,
  left,
  top,
  request,
  active,
  sidebarWidth,
  onMove,
}: DraggableSidebarItemProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ handlerId }, drop] = useDrop<DragItem, void, { handlerId: Identifier | null }>({
    accept: ItemTypes.REQUEST,
    collect: (monitor) => ({ handlerId: monitor.getHandlerId() }),
    hover: (item, monitor) => {
      if (!ref.current) return;

      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) return;

      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = (clientOffset as XYCoord).y - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

      onMove(dragIndex, hoverIndex);

      // Note: we're mutating the monitor item here! Generally it's better to
      // avoid mutations, but it's good here for the sake of performance to
      // avoid expensive index searches.
      item.index = hoverIndex;
    },
  });

  const [monitor, drag, preview] = useDrag<DragItem, unknown, { isDragging: boolean }>(
    () => ({
      type: ItemTypes.REQUEST,
      item: () => ({ request, left, top, index }),
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [request, left, top, index],
  );

  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, []);

  const isDragging = !!monitor?.isDragging;
  console.log('IS DRAGGING', isDragging);
  drag(drop(ref));

  return (
    <div
      ref={ref}
      className={classnames(isDragging && 'bg-blue-200')}
      style={getStyles(left, top, sidebarWidth)}
      data-handler-id={handlerId}
    >
      <SidebarItem request={request} active={active} sidebarWidth={sidebarWidth} />
    </div>
  );
}

function getItemStyles(
  initialOffset: XYCoord | null,
  currentOffset: XYCoord | null,
): CSSProperties {
  if (!initialOffset || !currentOffset) {
    return { display: 'none' };
  }

  const { x, y } = currentOffset;

  const transform = `translate(${x}px, ${y}px)`;
  return {
    transform,
    WebkitTransform: transform,
  };
}

const CustomDragLayer = ({ sidebarWidth }: { sidebarWidth: number }) => {
  const dragProps = useDragLayer((monitor) => ({
    item: monitor.getItem(),
    itemType: monitor.getItemType(),
    initialOffset: monitor.getInitialSourceClientOffset(),
    currentOffset: monitor.getSourceClientOffset(),
    isDragging: monitor.isDragging(),
  }));

  const { itemType, isDragging, item, initialOffset, currentOffset } = dragProps;

  function renderItem() {
    switch (itemType) {
      case ItemTypes.REQUEST:
        return (
          <SidebarItem
            request={item.request}
            sidebarWidth={sidebarWidth}
            isDragging={dragProps.isDragging}
          />
        );
      default:
        return null;
    }
  }

  if (!isDragging) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="pointer" style={getItemStyles(initialOffset, currentOffset)}>
        {renderItem()}
      </div>
    </div>
  );
};
