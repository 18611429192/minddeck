import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeepSeekProvider, DeepSeek } from '../src/runtime/modules/ai-provider.js';

function responseOf(content='{"ok":true}'){
  return {ok:true,status:200,async json(){return {choices:[{message:{content}}]}}};
}

test('DeepSeek fast preset uses official endpoint/model and non-thinking JSON mode',async()=>{
  let request=null;
  const provider=createDeepSeekProvider({preset:'fast',apiKey:'temporary-secret',fetch:async(url,options)=>{request={url,options,body:JSON.parse(options.body)};return responseOf('{"value":1}')}});
  await provider.generateStructured({system:'Return JSON only',user:'Return JSON'});
  assert.equal(request.url,'https://api.deepseek.com/chat/completions');
  assert.equal(request.body.model,'deepseek-v4-flash');
  assert.deepEqual(request.body.response_format,{type:'json_object'});
  assert.deepEqual(request.body.thinking,{type:'disabled'});
  assert.equal(request.body.temperature,0.2);
  assert.equal(request.options.headers.authorization,'Bearer temporary-secret');
  assert.equal(provider.describe().apiKey,'[configured]');
  assert.ok(!JSON.stringify(provider.describe()).includes('temporary-secret'));
});

test('DeepSeek quality preset enables reasoning without sampling parameters',async()=>{
  let body=null;
  const provider=createDeepSeekProvider({preset:'quality',apiKey:'x',fetch:async(_url,options)=>{body=JSON.parse(options.body);return responseOf('{"value":1}')}});
  await provider.generateStructured({system:'Return JSON only',user:'Return JSON'});
  assert.equal(body.model,'deepseek-v4-pro');
  assert.deepEqual(body.thinking,{type:'enabled'});
  assert.equal(body.reasoning_effort,'high');
  assert.equal('temperature' in body,false);
});

test('DeepSeek connection test validates JSON ping',async()=>{
  const provider=createDeepSeekProvider({apiKey:'x',fetch:async()=>responseOf('{"ok":true}')});
  const result=await provider.testConnection();
  assert.equal(result.ok,true);
  assert.equal(result.provider.model,DeepSeek.models.fast);
});
