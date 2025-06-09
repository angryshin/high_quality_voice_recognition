class EnhancedSpeechRecognitionApp {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.finalTranscript = '';
        this.lastError = null;
        this.lastInterimTranscript = '';

        this.initElements();
        this.initSpeechRecognition();
        this.bindEvents();
    }

    initElements() {
        this.startButton = document.getElementById('startButton');
        this.status = document.getElementById('status');
        this.resultText = document.getElementById('resultText');
        this.clearButton = document.getElementById('clearButton');
        this.copyButton = document.getElementById('copyButton');
        this.saveButton = document.getElementById('saveButton');
        this.languageSelect = document.getElementById('languageSelect');
        this.errorMessage = document.getElementById('errorMessage');
        this.increaseFontSizeButton = document.getElementById('increaseFontSize');
        this.decreaseFontSizeButton = document.getElementById('decreaseFontSize');
        this.fontSizeDisplay = document.getElementById('fontSizeDisplay');
        this.confidenceFill = document.getElementById('confidenceFill');
        this.currentFontSize = 1.2;
    }

    initSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            this.showError('이 브라우저는 음성인식을 지원하지 않습니다. Chrome 브라우저를 사용해주세요.');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();

        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;
        this.recognition.lang = this.languageSelect.value;

        if ('SpeechGrammarList' in window) {
            const grammarList = new SpeechGrammarList();
            this.recognition.grammars = grammarList;
        }

        this.setupRecognitionEvents();
    }

    setupRecognitionEvents() {
        if (!this.recognition) return;

        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateUI();
            this.updateStatus('🎤 음성을 듣고 있습니다... 편안하게 말씀해주세요.');
            this.hideError();
            this.lastError = null;
        };

        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let confidence = 0;
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                const transcript = result[0].transcript;
                confidence = Math.max(confidence, result[0].confidence || 0.8);
                if (result.isFinal) {
                    this.finalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }
            this.lastInterimTranscript = interimTranscript;
            this.displayResults(this.finalTranscript, interimTranscript);
            this.updateConfidence(confidence);
        };

        this.recognition.onend = () => {
            if (this.lastInterimTranscript && this.lastInterimTranscript.trim()) {
                this.finalTranscript += this.lastInterimTranscript + ' ';
                this.lastInterimTranscript = '';
                this.displayResults(this.finalTranscript, '');
            }
            if (
                this.isListening &&
                this.lastError !== 'not-allowed' &&
                this.lastError !== 'service-not-allowed' &&
                this.lastError !== 'audio-capture'
            ) {
                try {
                    this.recognition.start();
                } catch (e) {
                    this.isListening = false;
                    this.updateUI();
                    this.updateStatus('🔇 음성인식이 종료되었습니다.');
                }
            } else {
                this.isListening = false;
                this.updateUI();
                this.updateStatus('🔇 음성인식이 종료되었습니다.');
                this.updateConfidence(0);
            }
        };

        this.recognition.onerror = (event) => {
            this.lastError = event.error;
            this.isListening = false;
            this.updateUI();

            const errorMessages = {
                'network': '🌐 네트워크 연결을 확인해주세요.',
                'not-allowed': '🎤 마이크 권한이 필요합니다. 브라우저 설정에서 허용해주세요.',
                'no-speech': '🔇 음성이 감지되지 않았습니다. 다시 시도해주세요.',
                'audio-capture': '🎧 마이크에 접근할 수 없습니다. 연결을 확인해주세요.',
                'service-not-allowed': '🚫 음성인식 서비스가 차단되었습니다.',
                'bad-grammar': '📝 음성 인식 문법 오류가 발생했습니다.'
            };

            const errorMsg = errorMessages[event.error] || `❌ 음성인식 오류: ${event.error}`;
            this.showError(errorMsg);
            this.updateStatus('❌ 음성인식 오류 발생');

            if (["no-speech", "network"].includes(event.error)) {
                setTimeout(() => {
                    if (!this.isListening) {
                        this.startRecognition();
                    }
                }, 1000);
            }
        };

        this.recognition.onnomatch = () => {
            this.updateStatus('🤔 음성을 명확히 인식하지 못했습니다. 다시 시도해주세요.');
            setTimeout(() => {
                if (!this.isListening) {
                    this.startRecognition();
                }
            }, 1000);
        };
    }

    bindEvents() {
        this.startButton.addEventListener('click', () => {
            if (this.isListening) {
                this.stopRecognition();
            } else {
                this.startRecognition();
            }
        });

        this.languageSelect.addEventListener('change', () => {
            if (this.recognition) {
                this.recognition.lang = this.languageSelect.value;
            }
            const langName = this.languageSelect.options[this.languageSelect.selectedIndex].text;
            this.updateStatus(`🌍 언어가 ${langName}로 변경되었습니다.`);
        });

        this.clearButton.addEventListener('click', () => {
            this.finalTranscript = '';
            this.resultText.value = '여기에 인식된 텍스트가 실시간으로 표시됩니다.';
            this.updateStatus('🗑️ 텍스트가 지워졌습니다.');
        });

        this.copyButton.addEventListener('click', () => {
            const textToCopy = this.resultText.value.trim();
            if (textToCopy) {
                navigator.clipboard.writeText(textToCopy).then(() => {
                    this.updateStatus('📋 텍스트가 클립보드에 복사되었습니다.');
                }).catch(() => {
                    this.fallbackCopy(textToCopy);
                });
            } else {
                this.updateStatus('📝 복사할 텍스트가 없습니다.');
            }
        });

        this.saveButton.addEventListener('click', () => {
            this.saveAsFile();
        });

        this.increaseFontSizeButton.addEventListener('click', () => {
            this.changeFontSize(0.1);
        });

        this.decreaseFontSizeButton.addEventListener('click', () => {
            this.changeFontSize(-0.1);
        });

        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && e.ctrlKey) {
                e.preventDefault();
                if (this.isListening) {
                    this.stopRecognition();
                } else {
                    this.startRecognition();
                }
            }
        });
    }

    startRecognition() {
        if (!this.recognition) {
            this.showError('음성인식을 초기화할 수 없습니다.');
            return;
        }

        try {
            this.recognition.start();
        } catch (error) {
            this.showError('음성인식 시작 실패: ' + error.message);
        }
    }

    stopRecognition() {
        if (this.recognition && this.isListening) {
            this.isListening = false;
            this.recognition.stop();
            this.updateUI();
            this.updateStatus('🔇 음성인식 중단 요청됨');
        }
    }

    changeFontSize(delta) {
        this.currentFontSize += delta;
        this.currentFontSize = Math.max(0.5, Math.min(3, this.currentFontSize));
        this.resultText.style.fontSize = `${this.currentFontSize}em`;
        this.fontSizeDisplay.textContent = `${Math.round(this.currentFontSize * 100)}%`;
    }

    updateConfidence(confidence) {
        const percentage = Math.round(confidence * 100);
        this.confidenceFill.style.width = `${percentage}%`;
    }

    displayResults(finalText, interimText) {
        this.resultText.value = finalText + interimText;
        this.resultText.scrollTop = this.resultText.scrollHeight;
    }

    saveAsFile() {
        const textToSave = this.finalTranscript.trim();
        if (!textToSave) {
            this.updateStatus('💾 저장할 텍스트가 없습니다.');
            return;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `음성인식_${timestamp}.txt`;

        const blob = new Blob([textToSave], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.updateStatus('💾 텍스트 파일이 저장되었습니다.');
    }

    fallbackCopy(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        this.updateStatus('📋 텍스트가 복사되었습니다.');
    }

    updateUI() {
        if (this.isListening) {
            this.startButton.classList.add('listening');
            this.startButton.title = '음성인식 중지 (Ctrl+Space)';
            this.status.classList.remove('idle');
            this.status.classList.add('listening');
        } else {
            this.startButton.classList.remove('listening');
            this.startButton.title = '음성인식 시작 (Ctrl+Space)';
            this.status.classList.remove('listening');
            this.status.classList.add('idle');
        }
    }

    updateStatus(message) {
        this.status.textContent = message;
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.style.display = 'block';
        setTimeout(() => {
            this.hideError();
        }, 10000);
    }

    hideError() {
        this.errorMessage.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new EnhancedSpeechRecognitionApp();
}); 