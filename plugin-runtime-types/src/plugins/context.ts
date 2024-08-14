import { GetHttpRequestByIdRequest } from '../gen/GetHttpRequestByIdRequest';
import { GetHttpRequestByIdResponse } from '../gen/GetHttpRequestByIdResponse';
import { RenderHttpRequestRequest } from '../gen/RenderHttpRequestRequest';
import { RenderHttpRequestResponse } from '../gen/RenderHttpRequestResponse';
import { SendHttpRequestRequest } from '../gen/SendHttpRequestRequest';
import { SendHttpRequestResponse } from '../gen/SendHttpRequestResponse';
import { ShowToastRequest } from '../gen/ShowToastRequest';

export type YaakContext = {
  clipboard: {
    copyText(text: string): void;
  };
  toast: {
    show(args: ShowToastRequest): void;
  };
  httpRequest: {
    send(args: SendHttpRequestRequest): Promise<SendHttpRequestResponse['httpResponse']>;
    getById(args: GetHttpRequestByIdRequest): Promise<GetHttpRequestByIdResponse['httpRequest']>;
    render(args: RenderHttpRequestRequest): Promise<RenderHttpRequestResponse['httpRequest']>;
  };
};
