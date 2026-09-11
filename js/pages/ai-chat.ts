// ai-chat.ts — Chat rendering + send logic, extracted from ai_form.ts.
// State (chatHistory, latestCandidateData, etc.) lives in ai_form.ts;
// functions receive it as params to keep modules decoupled.
import { escapeHtml } from '../core/html.ts';
import { withRetry } from '../core/retry.ts';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'model';
  content?: string;
  parts?: { text: string }[];
}

export interface ChatDeps {
  $: (id: string) => HTMLElement | null;
  chatHistory: ChatMessage[];
  latestCandidateData: Record<string, any>;
  currentPhotoBase64: string;
  urlJeklin: string;
  formContext: { flow: string };
  saveToLocal: () => void;
  mergeCandidateData: (a: Record<string, any>, b: any) => Record<string, any>;
  updateFormUI: () => void;
}

export function appendHTML(sender: string, text: string, deps: ChatDeps) {
  var isUser = sender === 'user';
  var cleanText = escapeHtml(text).replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

  var userIcon = '<i class="fas fa-user"></i>';
  if (deps.currentPhotoBase64) {
    userIcon =
      '<img src="data:image/jpeg;base64,' +
      deps.currentPhotoBase64 +
      '" alt="" class="w-full h-full object-cover" onerror="this.outerHTML=\'<i class=&quot;fas fa-user&quot;></i>\'">';
  } else {
    var imgPreview = document.getElementById('previewFoto');
    if (
      imgPreview &&
      imgPreview.src &&
      imgPreview.src.length > 20 &&
      !imgPreview.classList.contains('hidden')
    ) {
      userIcon =
        '<img src="' +
        imgPreview.src +
        '" alt="" class="w-full h-full object-cover" onerror="this.outerHTML=\'<i class=&quot;fas fa-user&quot;></i>\'">';
    }
  }

  var aiIcon =
    '<img src="' + deps.urlJeklin + '" alt="" class="w-full h-full object-cover rounded-full">';

  var htmlStr =
    '<div class="flex gap-2 ' +
    (isUser ? 'flex-row-reverse' : '') +
    ' fade-in">' +
    '<div class="w-8 h-8 rounded-full overflow-hidden ' +
    (isUser ? 'bg-sky-500' : 'bg-amber-500 p-0.5') +
    ' flex-shrink-0 flex items-center justify-center text-xs text-white shadow">' +
    (isUser ? userIcon : aiIcon) +
    '</div>' +
    '<div class="bg-slate-800 p-2.5 rounded-xl ' +
    (isUser
      ? 'rounded-tr-none text-sky-100 bg-sky-900/40 border border-sky-800'
      : 'rounded-tl-none text-slate-200 border border-slate-700') +
    ' text-[11px] md:text-xs max-w-[85%] shadow leading-relaxed whitespace-pre-wrap">' +
    cleanText +
    '</div>' +
    '</div>';

  var chatBox = deps.$('chatBox');
  if (chatBox) {
    chatBox.insertAdjacentHTML('beforeend', htmlStr);
    setTimeout(function () {
      chatBox.scrollTop = chatBox.scrollHeight;
    }, 100);
  }
}

export function sendMessage(deps: ChatDeps) {
  var inputEl = deps.$('userInput') as HTMLInputElement;
  var btnEl = deps.$('sendBtn') as HTMLButtonElement;
  if (!inputEl || !btnEl) return;
  var text = inputEl.value.trim();
  if (!text) return;

  appendHTML('user', text, deps);
  inputEl.value = '';
  deps.chatHistory.push({ role: 'user', content: text });
  deps.saveToLocal();

  inputEl.disabled = true;
  btnEl.disabled = true;

  var typingEl = deps.$('aiTypingStatus');
  if (typingEl) {
    typingEl.innerHTML =
      '<i class="fas fa-magic fa-spin mr-2"></i> ' + window.tr('form.ai_chat_typing');
    typingEl.classList.remove('hidden');
  }

  var trimmedHistory = deps.chatHistory.slice(-20);
  var payloadToAI = {
    flow: deps.formContext.flow,
    history: trimmedHistory,
    currentData: deps.latestCandidateData,
    lang: typeof window.CURRENT_LANG !== 'undefined' ? window.CURRENT_LANG : 'id',
  };

  withRetry(function () {
    return window.callAPI('processAIChat', payloadToAI);
  }, 2, 2000)
    .then(function (res) {
      inputEl.disabled = false;
      btnEl.disabled = false;
      inputEl.focus();
      if (typingEl) typingEl.classList.add('hidden');

      if (res.success === false) {
        appendHTML('ai', res.error || window.tr('ui.toast_ai_cv_locked'), deps);
        return;
      }

      if (res.reply) {
        var finalReply = res.reply;
        if (typeof res.reply === 'string' && res.reply.startsWith('{')) {
          try {
            var p = JSON.parse(res.reply.replace(/\n/g, '\\n'));
            if (p.reply) finalReply = p.reply;
            if (p.data) res.data = Object.assign({}, res.data, p.data);
          } catch (e) {
            var match = res.reply.match(/"reply"\s*:\s*"([^]*?)"\s*,/);
            if (match && match[1]) finalReply = match[1];
          }
        }
        appendHTML('ai', finalReply, deps);
        deps.chatHistory.push({
          role: 'assistant',
          content: typeof res === 'string' ? res : JSON.stringify(res),
        });
      }
      if (res.data) {
        deps.latestCandidateData = deps.mergeCandidateData(deps.latestCandidateData, res.data);
        deps.updateFormUI();
      }
      deps.saveToLocal();
    })
    .catch(function (err) {
      inputEl.disabled = false;
      btnEl.disabled = false;
      if (typingEl) typingEl.classList.add('hidden');
      appendHTML('ai', window.tr('form.ai_chat_error'), deps);
    });
}
