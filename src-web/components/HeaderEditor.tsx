import React, { useEffect, useState } from 'react';
import { useRequestUpdate } from '../hooks/useRequest';
import type { HttpHeader, HttpRequest } from '../lib/models';
import { IconButton } from './IconButton';
import { Input } from './Input';
import { VStack } from './Stacks';

interface Props {
  request: HttpRequest;
}

type PairWithId = { header: Partial<HttpHeader>; id: string };

export function HeaderEditor({ request }: Props) {
  const updateRequest = useRequestUpdate(request);
  const saveHeaders = (pairs: PairWithId[]) => {
    const headers = pairs.map((p) => ({ name: '', value: '', ...p.header }));
    updateRequest.mutate({ headers });
  };

  const newPair = () => {
    return { header: { name: '', value: '' }, id: Math.random().toString() };
  };

  const [pairs, setPairs] = useState<PairWithId[]>(
    request.headers.map((h) => ({ header: h, id: Math.random().toString() })),
  );

  const setPairsAndSave = (fn: (pairs: PairWithId[]) => PairWithId[]) => {
    setPairs((oldPairs) => {
      const newPairs = fn(oldPairs);
      saveHeaders(newPairs);
      return newPairs;
    });
  };

  const handleChangeHeader = (pair: PairWithId) => {
    setPairsAndSave((pairs) =>
      pairs.map((p) =>
        pair.id !== p.id ? p : { id: p.id, header: { ...p.header, ...pair.header } },
      ),
    );
  };

  useEffect(() => {
    const lastPair = pairs[pairs.length - 1];
    if (lastPair === undefined) {
      setPairs([newPair()]);
      return;
    }

    if (lastPair.header.name !== '' || lastPair.header.value !== '') {
      setPairsAndSave((pairs) => [...pairs, newPair()]);
    }
  }, [pairs]);

  const handleDelete = (pair: PairWithId) => {
    setPairsAndSave((oldPairs) => oldPairs.filter((p) => p.id !== pair.id));
  };

  return (
    <VStack space={2}>
      {pairs.map((p, i) => (
        <FormRow
          key={p.id}
          pair={p}
          onChange={handleChangeHeader}
          onDelete={i < pairs.length - 1 ? handleDelete : undefined}
        />
      ))}
    </VStack>
  );
}

function FormRow({
  autoFocus,
  pair,
  onChange,
  onDelete,
}: {
  autoFocus?: boolean;
  pair: PairWithId;
  onChange: (pair: PairWithId) => void;
  onDelete?: (pair: PairWithId) => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_1fr_2.5rem] grid-rows-1 gap-2 items-center">
      <Input
        hideLabel
        autoFocus={autoFocus}
        useEditor={{ useTemplating: true }}
        name="name"
        label="Name"
        placeholder="name"
        defaultValue={pair.header.name}
        onChange={(name) => onChange({ id: pair.id, header: { name } })}
      />
      <Input
        hideLabel
        name="value"
        label="Value"
        useEditor={{ useTemplating: true }}
        placeholder="value"
        defaultValue={pair.header.value}
        onChange={(value) => onChange({ id: pair.id, header: { value } })}
      />
      {onDelete && <IconButton icon="trash" onClick={() => onDelete(pair)} className="w-auto" />}
    </div>
  );
}
