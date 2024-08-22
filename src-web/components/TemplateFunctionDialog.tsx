import type {
  TemplateFunction,
  TemplateFunctionArg,
  TemplateFunctionCheckboxArg,
  TemplateFunctionHttpRequestArg,
  TemplateFunctionSelectArg,
  TemplateFunctionTextArg,
} from '@yaakapp/api';
import { useCallback, useMemo, useState } from 'react';
import type { FnArg } from '../gen/FnArg';
import type { Tokens } from '../gen/Tokens';
import { useActiveRequest } from '../hooks/useActiveRequest';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useHttpRequests } from '../hooks/useHttpRequests';
import { useRenderTemplate } from '../hooks/useRenderTemplate';
import { useTemplateTokensToString } from '../hooks/useTemplateTokensToString';
import { fallbackRequestName } from '../lib/fallbackRequestName';
import { Button } from './core/Button';
import { Checkbox } from './core/Checkbox';
import { InlineCode } from './core/InlineCode';
import { PlainInput } from './core/PlainInput';
import { Select } from './core/Select';
import { VStack } from './core/Stacks';

const NULL_ARG = '__NULL__';

interface Props {
  templateFunction: TemplateFunction;
  initialTokens: Tokens;
  hide: () => void;
  onChange: (insert: string) => void;
}

export function TemplateFunctionDialog({ templateFunction, hide, initialTokens, onChange }: Props) {
  const [argValues, setArgValues] = useState<Record<string, string | boolean>>(() => {
    const initial: Record<string, string> = {};
    const initialArgs =
      initialTokens.tokens[0]?.type === 'tag' && initialTokens.tokens[0]?.val.type === 'fn'
        ? initialTokens.tokens[0]?.val.args
        : [];
    for (const arg of templateFunction.args) {
      const initialArg = initialArgs.find((a) => a.name === arg.name);
      const initialArgValue =
        initialArg?.value.type === 'str'
          ? initialArg?.value.text
          : // TODO: Implement variable-based args
            '__NULL__';
      initial[arg.name] = initialArgValue ?? NULL_ARG;
    }

    return initial;
  });

  const setArgValue = useCallback((name: string, value: string | boolean) => {
    setArgValues((v) => ({ ...v, [name]: value }));
  }, []);

  const tokens: Tokens = useMemo(() => {
    const argTokens: FnArg[] = Object.keys(argValues).map((name) => ({
      name,
      value:
        argValues[name] === NULL_ARG
          ? { type: 'null' }
          : typeof argValues[name] === 'boolean'
          ? { type: 'bool', value: argValues[name] === true }
          : { type: 'str', text: String(argValues[name] ?? '') },
    }));

    return {
      tokens: [
        {
          type: 'tag',
          val: {
            type: 'fn',
            name: templateFunction.name,
            args: argTokens,
          },
        },
      ],
    };
  }, [argValues, templateFunction.name]);

  const tagText = useTemplateTokensToString(tokens);

  const handleDone = () => {
    if (tagText.data) {
      onChange(tagText.data);
    }
    hide();
  };

  const debouncedTagText = useDebouncedValue(tagText.data ?? '', 200);
  const rendered = useRenderTemplate(debouncedTagText);

  return (
    <VStack className="pb-3" space={4}>
      <VStack space={2}>
        {templateFunction.args.map((a: TemplateFunctionArg, i: number) => {
          switch (a.type) {
            case 'select':
              return (
                <SelectArg
                  key={i}
                  arg={a}
                  onChange={(v) => setArgValue(a.name, v)}
                  value={argValues[a.name] ? String(argValues[a.name]) : '__ERROR__'}
                />
              );
            case 'text':
              return (
                <TextArg
                  key={i}
                  arg={a}
                  onChange={(v) => setArgValue(a.name, v)}
                  value={argValues[a.name] ? String(argValues[a.name]) : '__ERROR__'}
                />
              );
            case 'checkbox':
              return (
                <CheckboxArg
                  key={i}
                  arg={a}
                  onChange={(v) => setArgValue(a.name, v)}
                  value={argValues[a.name] !== undefined ? argValues[a.name] === true : false}
                />
              );
            case 'http_request':
              return (
                <HttpRequestArg
                  key={i}
                  arg={a}
                  onChange={(v) => setArgValue(a.name, v)}
                  value={argValues[a.name] ? String(argValues[a.name]) : '__ERROR__'}
                />
              );
          }
        })}
      </VStack>
      <InlineCode className="select-text cursor-text">{rendered.data}</InlineCode>
      <Button color="primary" onClick={handleDone}>
        Done
      </Button>
    </VStack>
  );
}

function TextArg({
  arg,
  onChange,
  value,
}: {
  arg: TemplateFunctionTextArg;
  value: string;
  onChange: (v: string) => void;
}) {
  const handleChange = useCallback(
    (value: string) => {
      onChange(value === '' ? NULL_ARG : value);
    },
    [onChange],
  );

  return (
    <PlainInput
      name={arg.name}
      onChange={handleChange}
      defaultValue={value === NULL_ARG ? '' : value}
      label={arg.label ?? arg.name}
      hideLabel={arg.label == null}
      placeholder={arg.placeholder ?? arg.defaultValue ?? ''}
    />
  );
}

function SelectArg({
  arg,
  value,
  onChange,
}: {
  arg: TemplateFunctionSelectArg;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select
      label={arg.label ?? arg.name}
      name={arg.name}
      onChange={onChange}
      value={value}
      options={[
        ...arg.options.map((a) => ({
          label: a.name + (arg.defaultValue === a.value ? ' (default)' : ''),
          value: a.value === arg.defaultValue ? NULL_ARG : a.value,
        })),
      ]}
    />
  );
}

function HttpRequestArg({
  arg,
  value,
  onChange,
}: {
  arg: TemplateFunctionHttpRequestArg;
  value: string;
  onChange: (v: string) => void;
}) {
  const httpRequests = useHttpRequests();
  const activeRequest = useActiveRequest();
  return (
    <Select
      label={arg.label ?? arg.name}
      name={arg.name}
      onChange={onChange}
      value={value}
      options={[
        ...httpRequests
          .filter((r) => r.id != activeRequest?.id)
          .map((r) => ({
            label: fallbackRequestName(r),
            value: r.id,
          })),
      ]}
    />
  );
}

function CheckboxArg({
  arg,
  onChange,
  value,
}: {
  arg: TemplateFunctionCheckboxArg;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Checkbox
      onChange={onChange}
      checked={value}
      title={arg.label ?? arg.name}
      hideLabel={arg.label == null}
    />
  );
}
