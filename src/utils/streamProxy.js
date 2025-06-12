import { convertStreamUrlViaProxy } from '../config/proxyConfig';

export const criarUrlProxyStream = (urlOriginal = '') => convertStreamUrlViaProxy(urlOriginal);

export default criarUrlProxyStream; 