import useResizeObserver from '@react-hook/resize-observer';
import classNames from 'classnames';
import type { CSSProperties } from 'react';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { createGlobalState } from 'react-use';
import type { ReflectResponseService } from '../hooks/useGrpc';
import { useGrpcConnections } from '../hooks/useGrpcConnections';
import { useRequestUpdateKey } from '../hooks/useRequestUpdateKey';
import { useUpdateGrpcRequest } from '../hooks/useUpdateGrpcRequest';
import type { GrpcMetadataEntry, GrpcRequest } from '../lib/models';
import { AUTH_TYPE_BASIC, AUTH_TYPE_BEARER, AUTH_TYPE_NONE } from '../lib/models';
import { BasicAuth } from './BasicAuth';
import { BearerAuth } from './BearerAuth';
import { Button } from './core/Button';
import { Icon } from './core/Icon';
import { IconButton } from './core/IconButton';
import { PairEditor } from './core/PairEditor';
import { RadioDropdown } from './core/RadioDropdown';
import { HStack, VStack } from './core/Stacks';
import type { TabItem } from './core/Tabs/Tabs';
import { TabContent, Tabs } from './core/Tabs/Tabs';
import { EmptyStateText } from './EmptyStateText';
import { GrpcEditor } from './GrpcEditor';
import { UrlBar } from './UrlBar';

interface Props {
  style?: CSSProperties;
  className?: string;
  activeRequest: GrpcRequest;
  protoFiles: string[];
  reflectionError?: string;
  reflectionLoading?: boolean;
  methodType:
    | 'unary'
    | 'client_streaming'
    | 'server_streaming'
    | 'streaming'
    | 'no-schema'
    | 'no-method';
  onCommit: () => void;
  onCancel: () => void;
  onSend: (v: { message: string }) => void;
  onGo: () => void;
  services: ReflectResponseService[] | null;
}

const useActiveTab = createGlobalState<string>('message');

export function GrpcConnectionSetupPane({
  style,
  services,
  methodType,
  activeRequest,
  protoFiles,
  reflectionError,
  reflectionLoading,
  onGo,
  onCommit,
  onCancel,
  onSend,
}: Props) {
  const connections = useGrpcConnections(activeRequest.id ?? null);
  const updateRequest = useUpdateGrpcRequest(activeRequest?.id ?? null);
  const activeConnection = connections[0] ?? null;
  const isStreaming = activeConnection?.elapsed === 0;
  const [activeTab, setActiveTab] = useActiveTab();
  const { updateKey: forceUpdateKey } = useRequestUpdateKey(activeRequest.id ?? null);

  const [paneSize, setPaneSize] = useState(99999);
  const urlContainerEl = useRef<HTMLDivElement>(null);
  useResizeObserver<HTMLDivElement>(urlContainerEl.current, (entry) => {
    setPaneSize(entry.contentRect.width);
  });

  const handleChangeUrl = useCallback(
    (url: string) => updateRequest.mutateAsync({ url }),
    [updateRequest],
  );

  const handleChangeMessage = useCallback(
    (message: string) => updateRequest.mutateAsync({ message }),
    [updateRequest],
  );

  const select = useMemo(() => {
    const options =
      services?.flatMap((s) =>
        s.methods.map((m) => ({
          label: `${s.name.split('.', 2).pop() ?? s.name}/${m.name}`,
          value: `${s.name}/${m.name}`,
        })),
      ) ?? [];
    const value = `${activeRequest?.service ?? ''}/${activeRequest?.method ?? ''}`;
    return { value, options };
  }, [activeRequest?.method, activeRequest?.service, services]);

  const handleChangeService = useCallback(
    async (v: string) => {
      const [serviceName, methodName] = v.split('/', 2);
      if (serviceName == null || methodName == null) throw new Error('Should never happen');
      await updateRequest.mutateAsync({
        service: serviceName,
        method: methodName,
      });
    },
    [updateRequest],
  );

  const handleConnect = useCallback(async () => {
    if (activeRequest == null) return;

    if (activeRequest.service == null || activeRequest.method == null) {
      alert({
        id: 'grpc-invalid-service-method',
        title: 'Error',
        body: 'Service or method not selected',
      });
    }
    onGo();
  }, [activeRequest, onGo]);

  const handleSend = useCallback(async () => {
    if (activeRequest == null) return;
    onSend({ message: activeRequest.message });
  }, [activeRequest, onSend]);

  const tabs: TabItem[] = useMemo(
    () => [
      { value: 'message', label: 'Message' },
      {
        value: 'auth',
        label: 'Auth',
        options: {
          value: activeRequest.authenticationType,
          items: [
            { label: 'Basic Auth', shortLabel: 'Basic', value: AUTH_TYPE_BASIC },
            { label: 'Bearer Token', shortLabel: 'Bearer', value: AUTH_TYPE_BEARER },
            { type: 'separator' },
            { label: 'No Authentication', shortLabel: 'Auth', value: AUTH_TYPE_NONE },
          ],
          onChange: async (authenticationType) => {
            let authentication: GrpcRequest['authentication'] = activeRequest.authentication;
            if (authenticationType === AUTH_TYPE_BASIC) {
              authentication = {
                username: authentication.username ?? '',
                password: authentication.password ?? '',
              };
            } else if (authenticationType === AUTH_TYPE_BEARER) {
              authentication = {
                token: authentication.token ?? '',
              };
            }
            await updateRequest.mutateAsync({ authenticationType, authentication });
          },
        },
      },
      { value: 'metadata', label: 'Metadata' },
    ],
    [activeRequest.authentication, activeRequest.authenticationType, updateRequest],
  );

  const handleMetadataChange = useCallback(
    (metadata: GrpcMetadataEntry[]) => updateRequest.mutate({ metadata }),
    [updateRequest],
  );

  return (
    <VStack style={style}>
      <div
        ref={urlContainerEl}
        className={classNames(
          'grid grid-cols-[minmax(0,1fr)_auto] gap-1.5',
          paneSize < 400 && '!grid-cols-1',
        )}
      >
        <UrlBar
          url={activeRequest.url ?? ''}
          method={null}
          submitIcon={null}
          forceUpdateKey={forceUpdateKey}
          placeholder="localhost:50051"
          onSend={handleConnect}
          onUrlChange={handleChangeUrl}
          onCancel={onCancel}
          isLoading={isStreaming}
        />
        <HStack space={1.5}>
          <RadioDropdown
            value={select.value}
            onChange={handleChangeService}
            items={select.options.map((o) => ({
              label: o.label,
              value: o.value,
              type: 'default',
              shortLabel: o.label,
            }))}
            extraItems={[
              {
                label: 'Refresh',
                type: 'default',
                key: 'custom',
                leftSlot: <Icon className="text-fg-subtler" size="sm" icon="refresh" />,
              },
            ]}
          >
            <Button
              size="sm"
              variant="border"
              rightSlot={<Icon className="text-fg-subtler" size="sm" icon="chevronDown" />}
              disabled={isStreaming || services == null}
              className={classNames(
                'font-mono text-xs min-w-[5rem] !ring-0',
                paneSize < 400 && 'flex-1',
              )}
            >
              {select.options.find((o) => o.value === select.value)?.label ?? 'No Schema'}
            </Button>
          </RadioDropdown>
          {methodType === 'client_streaming' || methodType === 'streaming' ? (
            <>
              {isStreaming && (
                <>
                  <IconButton
                    className="border border-background-highlight-secondary"
                    size="sm"
                    title="Cancel"
                    onClick={onCancel}
                    icon="x"
                  />
                  <IconButton
                    className="border border-background-highlight-secondary"
                    size="sm"
                    title="Commit"
                    onClick={onCommit}
                    icon="check"
                  />
                </>
              )}
              <IconButton
                className="border border-background-highlight-secondary"
                size="sm"
                title={isStreaming ? 'Connect' : 'Send'}
                hotkeyAction="grpc_request.send"
                onClick={isStreaming ? handleSend : handleConnect}
                icon={isStreaming ? 'sendHorizontal' : 'arrowUpDown'}
              />
            </>
          ) : (
            <IconButton
              className="border border-background-highlight-secondary"
              size="sm"
              title={methodType === 'unary' ? 'Send' : 'Connect'}
              hotkeyAction="grpc_request.send"
              onClick={isStreaming ? onCancel : handleConnect}
              disabled={methodType === 'no-schema' || methodType === 'no-method'}
              icon={
                isStreaming
                  ? 'x'
                  : methodType.includes('streaming')
                  ? 'arrowUpDown'
                  : 'sendHorizontal'
              }
            />
          )}
        </HStack>
      </div>
      <Tabs
        value={activeTab}
        label="Request"
        onChangeValue={setActiveTab}
        tabs={tabs}
        tabListClassName="mt-2 !mb-1.5"
      >
        <TabContent value="message">
          <GrpcEditor
            onChange={handleChangeMessage}
            services={services}
            reflectionError={reflectionError}
            reflectionLoading={reflectionLoading}
            request={activeRequest}
            protoFiles={protoFiles}
          />
        </TabContent>
        <TabContent value="auth">
          {activeRequest.authenticationType === AUTH_TYPE_BASIC ? (
            <BasicAuth key={forceUpdateKey} request={activeRequest} />
          ) : activeRequest.authenticationType === AUTH_TYPE_BEARER ? (
            <BearerAuth key={forceUpdateKey} request={activeRequest} />
          ) : (
            <EmptyStateText>No Authentication {activeRequest.authenticationType}</EmptyStateText>
          )}
        </TabContent>
        <TabContent value="metadata">
          <PairEditor
            valueAutocompleteVariables
            nameAutocompleteVariables
            pairs={activeRequest.metadata}
            onChange={handleMetadataChange}
            forceUpdateKey={forceUpdateKey}
          />
        </TabContent>
      </Tabs>
    </VStack>
  );
}
