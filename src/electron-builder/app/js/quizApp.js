/**
 * 消防工程师习题练习系统
 * 主应用逻辑
 */

const quizApp = {
    data: {
        libraries: [],
        currentLibraryIndex: 0,
        currentIndex: 0,
        mode: 'practice', // practice 或 back
        isShuffled: false,
        theme: 'light'
    },
    
    // 初始化应用
    init() {
        this.applyTheme();
        this.loadFromStorage();
        this.setupEventListeners();
        this.updateUI();
    },
    
    // 应用主题
    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.data.theme);
    },
    
    // 从本地存储加载数据
    loadFromStorage() {
        const savedData = localStorage.getItem('quizAppData');
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                this.data = { ...this.data, ...parsedData };
            } catch (e) {
                console.error('加载数据失败:', e);
            }
        }
    },
    
    // 保存数据到本地存储
    saveToStorage() {
        try {
            localStorage.setItem('quizAppData', JSON.stringify(this.data));
        } catch (e) {
            console.error('保存数据失败:', e);
            this.showToast('保存数据失败，可能是存储空间不足', 'error');
        }
    },
    
    // 设置事件监听器
    setupEventListeners() {
        // 导入题库按钮
        document.getElementById('importButton').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });
        
        // 文件输入变化
        document.getElementById('fileInput').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.importLibrary(file);
            }
        });
        
        // 删除题库按钮
        document.getElementById('deleteButton').addEventListener('click', () => {
            if (this.data.libraries.length === 0) {
                this.showToast('没有可删除的题库', 'warning');
                return;
            }
            
            if (confirm(`确定要删除题库 "${this.getCurrentLibrary().name}" 吗？`)) {
                this.data.libraries.splice(this.data.currentLibraryIndex, 1);
                if (this.data.currentLibraryIndex >= this.data.libraries.length) {
                    this.data.currentLibraryIndex = Math.max(0, this.data.libraries.length - 1);
                }
                this.data.currentIndex = 0;
                this.saveToStorage();
                this.updateUI();
                this.showToast('题库已删除', 'success');
            }
        });
        
        // 模式切换按钮
        document.getElementById('modeButton').addEventListener('click', () => {
            this.data.mode = this.data.mode === 'practice' ? 'back' : 'practice';
            this.saveToStorage();
            this.updateUI();
        });
        
        // 乱序按钮
        document.getElementById('shuffleButton').addEventListener('click', () => {
            this.toggleShuffle();
        });
        
        // 跳转按钮
        document.getElementById('jumpButton').addEventListener('click', () => {
            const input = document.getElementById('jumpInput');
            const value = parseInt(input.value);
            if (value && value > 0) {
                this.jumpToQuestion(value - 1);
            }
        });
        
        // 上一题按钮
        document.getElementById('prevButton').addEventListener('click', () => {
            this.prevQuestion();
        });
        
        // 下一题按钮
        document.getElementById('nextButton').addEventListener('click', () => {
            this.nextQuestion();
        });
        
        // 重置按钮
        document.getElementById('resetButton').addEventListener('click', () => {
            this.resetLibrary();
        });
        
        // 收藏按钮
        document.getElementById('favoriteButton').addEventListener('click', () => {
            this.toggleFavorite();
        });
        
        // 主题切换按钮
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.data.theme = this.data.theme === 'light' ? 'dark' : 'light';
            this.applyTheme();
            this.saveToStorage();
        });
        
        // 键盘事件
        document.addEventListener('keydown', (e) => {
            // 如果是在输入框中按键，不处理
            if (e.target.tagName === 'INPUT') return;
            
            const library = this.getCurrentLibrary();
            if (!library || library.questions.length === 0) return;
            
            if (e.key === 'ArrowLeft') {
                this.prevQuestion();
            } else if (e.key === 'ArrowRight') {
                this.nextQuestion();
            } else if (e.key === ' ') {
                // 空格键切换模式
                e.preventDefault();
                this.data.mode = this.data.mode === 'practice' ? 'back' : 'practice';
                this.saveToStorage();
                this.updateUI();
            } else if (/^[A-E]$/i.test(e.key)) {
                // A-E 选择选项
                const letter = e.key.toUpperCase();
                const question = this.getCurrentQuestion();
                if (question && question[`选项${letter}`]) {
                    if (question.类型 === '单选') {
                        this.selectOption(letter);
                    } else if (question.类型 === '多选' && this.data.mode === 'practice') {
                        this.toggleMultiSelectOption(letter);
                    }
                }
            }
        });
        
        // 拖放导入
        const dropArea = document.querySelector('.app');
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.classList.add('drag-over');
            }, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.classList.remove('drag-over');
            }, false);
        });
        
        dropArea.addEventListener('drop', (e) => {
            const file = e.dataTransfer.files[0];
            if (file) {
                this.importLibrary(file);
            }
        }, false);
    },
    
    // 获取当前题库
    getCurrentLibrary() {
        if (this.data.libraries.length === 0) return null;
        return this.data.libraries[this.data.currentLibraryIndex];
    },
    
    // 获取当前题目
    getCurrentQuestion() {
        const library = this.getCurrentLibrary();
        if (!library || library.questions.length === 0) return null;
        return library.questions[this.data.currentIndex];
    },
    
    // 导入题库
    importLibrary(file) {
        // 根据文件扩展名选择不同的导入方法
        if (file.name.match(/\.(xlsx|xls)$/i)) {
            this.importExcelLibrary(file);
        } else if (file.name.match(/\.json$/i)) {
            this.importJsonLibrary(file);
        } else {
            this.showToast('请选择支持的文件格式 (.xlsx, .xls 或 .json)', 'warning');
        }
    },
    
    // 导入Excel题库
    importExcelLibrary(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                
                if (jsonData.length === 0) {
                    this.showToast('Excel 文件中没有数据', 'warning');
                    return;
                }
                
                // 检查必要的字段
                const requiredFields = ['题干', '选项A', '选项B', '答案'];
                const firstRow = jsonData[0];
                const missingFields = requiredFields.filter(field => !(field in firstRow));
                
                if (missingFields.length > 0) {
                    this.showToast(`Excel 文件缺少必要的字段: ${missingFields.join(', ')}`, 'warning');
                    return;
                }
                
                // 构建题库对象
                const library = {
                    name: file.name.replace(/\.(xlsx|xls)$/i, ''),
                    questions: jsonData.map(row => {
                        // 确定题目类型（单选或多选）
                        const answerLength = row.答案 ? row.答案.length : 0;
                        const questionType = answerLength > 1 ? '多选' : '单选';
                        
                        return {
                            题干: row.题干 || '',
                            选项A: row.选项A || '',
                            选项B: row.选项B || '',
                            选项C: row.选项C || '',
                            选项D: row.选项D || '',
                            选项E: row.选项E || '',
                            答案: row.答案 || '',
                            解析: row.解析 || '',
                            类型: row.类型 || questionType,
                            收藏: false
                        };
                    }),
                    userAnswers: {},
                    originalOrder: []
                };
                
                // 添加到题库列表
                this.data.libraries.push(library);
                this.data.currentLibraryIndex = this.data.libraries.length - 1;
                this.data.currentIndex = 0;
                this.data.mode = 'practice';
                this.data.isShuffled = false;
                
                this.saveToStorage();
                this.updateUI();
                this.showToast(`成功导入题库: ${library.name}，共 ${library.questions.length} 题`, 'success');
            } catch (error) {
                console.error('导入Excel题库失败:', error);
                this.showToast('导入题库失败，请检查Excel文件格式', 'error');
            }
        };
        reader.readAsArrayBuffer(file);
    },
    
    // 导入JSON题库
    importJsonLibrary(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonData = JSON.parse(e.target.result);
                
                if (!Array.isArray(jsonData) || jsonData.length === 0) {
                    this.showToast('JSON 文件格式不正确或没有数据', 'warning');
                    return;
                }
                
                // 检查必要的字段
                const requiredFields = ['题干', '选项A', '选项B', '答案'];
                const firstRow = jsonData[0];
                const missingFields = requiredFields.filter(field => !(field in firstRow));
                
                if (missingFields.length > 0) {
                    this.showToast(`JSON 文件缺少必要的字段: ${missingFields.join(', ')}`, 'warning');
                    return;
                }
                
                // 构建题库对象
                const library = {
                    name: file.name.replace(/\.json$/i, ''),
                    questions: jsonData.map(row => {
                        // 确定题目类型（单选或多选）
                        const answerLength = row.答案 ? row.答案.length : 0;
                        const questionType = answerLength > 1 ? '多选' : '单选';
                        
                        return {
                            题干: row.题干 || '',
                            选项A: row.选项A || '',
                            选项B: row.选项B || '',
                            选项C: row.选项C || '',
                            选项D: row.选项D || '',
                            选项E: row.选项E || '',
                            答案: row.答案 || '',
                            解析: row.解析 || '',
                            类型: row.类型 || questionType,
                            收藏: false
                        };
                    }),
                    userAnswers: {},
                    originalOrder: []
                };
                
                // 添加到题库列表
                this.data.libraries.push(library);
                this.data.currentLibraryIndex = this.data.libraries.length - 1;
                this.data.currentIndex = 0;
                this.data.mode = 'practice';
                this.data.isShuffled = false;
                
                this.saveToStorage();
                this.updateUI();
                this.showToast(`成功导入题库: ${library.name}，共 ${library.questions.length} 题`, 'success');
            } catch (error) {
                console.error('导入JSON题库失败:', error);
                this.showToast('导入题库失败，请检查JSON文件格式', 'error');
            }
        };
        reader.readAsText(file);
    },
    
    // 切换乱序/顺序模式
    toggleShuffle() {
        const library = this.getCurrentLibrary();
        if (!library || library.questions.length === 0) return;
        
        this.data.isShuffled = !this.data.isShuffled;
        
        if (this.data.isShuffled) {
            // 保存原始顺序
            library.originalOrder = [...Array(library.questions.length).keys()];
            
            // 使用 Fisher-Yates 算法打乱题目顺序
            const questions = library.questions;
            const userAnswers = {};
            
            // 创建用户答案的映射
            for (let i = 0; i < questions.length; i++) {
                if (library.userAnswers[i]) {
                    userAnswers[i] = library.userAnswers[i];
                }
            }
            
            // 打乱题目顺序
            for (let i = questions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [questions[i], questions[j]] = [questions[j], questions[i]];
                
                // 更新用户答案的映射
                const tempAnswerI = userAnswers[i];
                const tempAnswerJ = userAnswers[j];
                
                if (tempAnswerI) userAnswers[j] = tempAnswerI;
                if (tempAnswerJ) userAnswers[i] = tempAnswerJ;
            }
            
            library.userAnswers = userAnswers;
        } else if (library.originalOrder && library.originalOrder.length > 0) {
            // 恢复原始顺序
            const originalQuestions = [];
            const userAnswers = {};
            
            // 创建用户答案的映射
            for (let i = 0; i < library.questions.length; i++) {
                if (library.userAnswers[i]) {
                    userAnswers[library.originalOrder[i]] = library.userAnswers[i];
                }
            }
            
            // 恢复原始顺序
            for (let i = 0; i < library.originalOrder.length; i++) {
                originalQuestions[library.originalOrder[i]] = library.questions[i];
            }
            
            library.questions = originalQuestions;
            library.userAnswers = userAnswers;
            library.originalOrder = [];
        }
        
        this.data.currentIndex = 0;
        this.saveToStorage();
        this.updateUI();
    },
    
    // 跳转到指定题目
    jumpToQuestion(index) {
        const library = this.getCurrentLibrary();
        if (!library || library.questions.length === 0) return;
        
        if (index >= 0 && index < library.questions.length) {
            this.data.currentIndex = index;
            this.saveToStorage();
            this.updateUI();
        }
    },
    
    // 上一题
    prevQuestion() {
        if (this.data.currentIndex > 0) {
            this.data.currentIndex--;
            this.saveToStorage();
            this.updateUI();
        }
    },
    
    // 下一题
    nextQuestion() {
        const library = this.getCurrentLibrary();
        if (!library || this.data.currentIndex >= library.questions.length - 1) return;
        
        this.data.currentIndex++;
        this.saveToStorage();
        this.updateUI();
    },
    
    // 切换题库
    switchLibrary(index) {
        if (index >= 0 && index < this.data.libraries.length) {
            this.data.currentLibraryIndex = index;
            this.data.currentIndex = 0;
            this.data.isShuffled = false;
            this.saveToStorage();
            this.updateUI();
        }
    },
    
    // 显示提示消息
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `notification ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        // 显示提示
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // 3秒后隐藏
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    },
    
    // 切换收藏状态
    toggleFavorite() {
        const question = this.getCurrentQuestion();
        if (!question) return;
        
        question.收藏 = !question.收藏;
        this.saveToStorage();
        this.updateFavoriteButton();
    },
    
    // 更新收藏按钮
    updateFavoriteButton() {
        const question = this.getCurrentQuestion();
        const favoriteButton = document.getElementById('favoriteButton');
        
        if (question && question.收藏) {
            favoriteButton.classList.add('active');
            favoriteButton.innerHTML = '<i class="fas fa-star"></i>';
        } else {
            favoriteButton.classList.remove('active');
            favoriteButton.innerHTML = '<i class="far fa-star"></i>';
        }
    },
    
    // 选择选项（单选题）
    selectOption(letter) {
        const question = this.getCurrentQuestion();
        if (!question || this.data.mode !== 'practice') return;
        
        const currentLibrary = this.getCurrentLibrary();
        const isCorrect = question.答案 === letter;
        
        currentLibrary.userAnswers[this.data.currentIndex] = {
            selected: letter,
            isCorrect: isCorrect,
            isSubmitted: true
        };
        
        this.saveToStorage();
        this.updateOptionStyles();
        this.renderAnswerAndExplanation();
        
        // 回答状态已集成到正确答案显示中
    },
    
    // 切换多选选项
    toggleMultiSelectOption(letter) {
        const question = this.getCurrentQuestion();
        if (!question || this.data.mode !== 'practice' || question.类型 !== '多选') return;
        
        const currentLibrary = this.getCurrentLibrary();
        let userAnswer = currentLibrary.userAnswers[this.data.currentIndex];
        
        if (!userAnswer) {
            userAnswer = {
                selected: [],
                isCorrect: false,
                isSubmitted: false
            };
        }
        
        if (!userAnswer.isSubmitted) {
            const index = userAnswer.selected.indexOf(letter);
            if (index === -1) {
                userAnswer.selected.push(letter);
            } else {
                userAnswer.selected.splice(index, 1);
            }
             
            currentLibrary.userAnswers[this.data.currentIndex] = userAnswer;
            this.saveToStorage();
            this.updateOptionStyles();
        }
    },
     
    // 更新选项样式
    updateOptionStyles() {
        const question = this.getCurrentQuestion();
        const library = this.getCurrentLibrary();
        const userAnswer = library.userAnswers[this.data.currentIndex];
        const options = document.querySelectorAll('.option');
     
        options.forEach(option => {
            option.classList.remove('correct-answer', 'wrong-answer', 'selected');
            const letter = option.querySelector('.option-letter').textContent.trim();
     
            if (this.data.mode === 'back') {
                if (question.答案.includes(letter)) {
                    option.classList.add('correct-answer');
                }
                return;
            }
     
            if (question.类型 === '单选') {
                if (userAnswer) {
                    if (userAnswer.selected === letter) {
                        option.classList.add(userAnswer.isCorrect ? 'correct-answer' : 'wrong-answer');
                    }
                    if (question.答案 === letter) {
                        option.classList.add('correct-answer');
                    }
                }
            }
            else if (question.类型 === '多选') {
                if (userAnswer?.isSubmitted) {
                    if (question.答案.includes(letter)) {
                        option.classList.add('correct-answer');
                    }
                    if (userAnswer.selected.includes(letter) && !question.答案.includes(letter)) {
                        option.classList.add('wrong-answer');
                    }
                } else {
                    if (userAnswer?.selected?.includes(letter)) {
                        option.classList.add('selected');
                    }
                }
            }
        });
    },
    
    handleMultiSelectSubmit() {
        const currentLibrary = this.getCurrentLibrary();
        const question = this.getCurrentQuestion();
        let userAnswer = currentLibrary.userAnswers[this.data.currentIndex];
      
        if (!userAnswer || userAnswer.selected.length === 0) return;
      
        const correctLetters = [...question.答案].sort().join('');
        const userLetters = [...userAnswer.selected].sort().join('');
        userAnswer.isCorrect = correctLetters === userLetters;
        userAnswer.isSubmitted = true;
      
        this.saveToStorage();
        this.updateOptionStyles();
        this.renderAnswerAndExplanation();
      
        // 回答状态已集成到正确答案显示中
    },
                 
    // 渲染题目
    renderQuestion() {
        const question = this.getCurrentQuestion();
        const optionsContainer = document.getElementById('options');
        optionsContainer.innerHTML = '';
         
        document.getElementById('question').textContent = question.题干 || '暂无题目';
         
        const optionLetters = ['A', 'B', 'C', 'D', 'E'];
        const currentLibrary = this.getCurrentLibrary();
        const userAnswer = currentLibrary.userAnswers[this.data.currentIndex];
        const isMultiSelect = question.类型 === '多选' && this.data.mode === 'practice';
     
        optionLetters.forEach((letter) => {
            const optionKey = `选项${letter}`;
            if (question[optionKey]) {
                const option = document.createElement('button');
                option.className = 'option';
                option.innerHTML = `
                    <span class="option-letter">${letter}</span>
                    <span class="option-text">${question[optionKey]}</span>
                `;
                 
                if (this.data.mode === 'back') {
                    option.classList.add('back-mode-option');
                    if (question.答案.includes(letter)) {
                        option.classList.add('correct-answer');
                    }
                } else {
                    if (isMultiSelect) {
                        option.addEventListener('click', () => this.toggleMultiSelectOption(letter));
                    } else {
                        option.addEventListener('click', () => this.selectOption(letter));
                    }
                }
                 
                optionsContainer.appendChild(option);
            }
        });
     
        if (isMultiSelect) {
            const submitButton = document.createElement('button');
            submitButton.id = 'submitButton';
            submitButton.className = 'button button-success';
            submitButton.textContent = '提交答案';
            submitButton.addEventListener('click', () => this.handleMultiSelectSubmit());
            optionsContainer.appendChild(submitButton);
        }
     
        this.updateOptionStyles();
        
        // answer-result元素已删除
    },
     
    // 渲染答案和解析
    renderAnswerAndExplanation() {
        const question = this.getCurrentQuestion();
        const library = this.getCurrentLibrary();
        const userAnswer = library.userAnswers[this.data.currentIndex];
         
        const shouldHide = this.data.mode === 'practice' &&
                         ((question.类型 === '多选' && !userAnswer?.isSubmitted) ||
                          (question.类型 === '单选' && !userAnswer));
     
        // 答案和解析显示已移至HTML中的renderAnswerAndExplanation函数
        // 这里不再需要处理显示逻辑
    },
     
    // 更新UI
    updateUI() {
        this.updateLibraryList();
        this.updateProgress();
        this.updateStatusInfo();
        this.renderQuestion();
        this.updateButtonStates();
        this.renderAnswerAndExplanation();
        this.updateFavoriteButton();
    },
     
    // 更新题库列表
    updateLibraryList() {
        const libraryList = document.getElementById('library-list');
        libraryList.innerHTML = '';
         
        this.data.libraries.forEach((library, index) => {
            const libraryItem = document.createElement('div');
            libraryItem.className = 'library-item';
            if (index === this.data.currentLibraryIndex) {
                libraryItem.classList.add('active');
            }
            libraryItem.textContent = library.name;
            libraryItem.addEventListener('click', () => this.switchLibrary(index));
            libraryList.appendChild(libraryItem);
        });
    },
     
    // 更新进度条
    updateProgress() {
        const library = this.getCurrentLibrary();
        const progress = library.questions.length > 0
            ? ((this.data.currentIndex + 1) / library.questions.length) * 100
            : 0;
            
        document.getElementById('progress').style.width = `${progress}%`;
        document.getElementById('progress-text').textContent = `${Math.round(progress)}%`;
        document.getElementById('progressCounter').textContent = 
            `${this.data.currentIndex + 1}/${library.questions.length}`;
        document.getElementById('questionCounter').textContent = 
            `第 ${this.data.currentIndex + 1} 题`;
    },
     
    // 更新状态信息
    updateStatusInfo() {
        const library = this.getCurrentLibrary();
        if (library.questions.length === 0) {
            document.getElementById('status-info').textContent = '当前题库没有题目';
            return;
        }
         
        document.getElementById('libraryStatus').textContent = `题库: ${library.name}`;
        document.getElementById('modeStatus').textContent = `模式: ${this.data.mode === 'practice' ? '练习' : '背题'}`;
        document.getElementById('orderStatus').textContent = `顺序: ${this.data.isShuffled ? '乱序' : '顺序'}`;
        
        document.getElementById('shuffleButton').textContent = 
            this.data.isShuffled ? '顺序练习' : '乱序练习';
        document.getElementById('modeButton').textContent = 
            this.data.mode === 'practice' ? '切换到背题模式' : '切换到练习模式';
    },
     
    // 更新按钮状态
    updateButtonStates() {
        const library = this.getCurrentLibrary();
        const hasQuestions = library.questions.length > 0;
         
        document.getElementById('prevButton').disabled = this.data.currentIndex === 0 || !hasQuestions;
        document.getElementById('nextButton').disabled =
            this.data.currentIndex === library.questions.length - 1 || !hasQuestions;
        document.getElementById('modeButton').disabled = !hasQuestions;
        document.getElementById('shuffleButton').disabled = !hasQuestions;
        document.getElementById('jumpButton').disabled = !hasQuestions;
        document.getElementById('jumpInput').disabled = !hasQuestions;
         
        if (hasQuestions) {
            document.getElementById('jumpInput').value = this.data.currentIndex + 1;
            document.getElementById('jumpInput').max = library.questions.length;
        } else {
            document.getElementById('jumpInput').value = '';
        }
    },
     
    // 重置题库
    resetLibrary() {
        if (this.data.libraries.length === 0) {
            this.showToast('没有可重置的题库', 'warning');
            return;
        }
         
        const currentLibrary = this.getCurrentLibrary();
        if (!currentLibrary.name || currentLibrary.questions.length === 0) {
            this.showToast('当前题库没有题目可重置', 'warning');
            return;
        }
         
        if (confirm(`确定要重置题库 "${currentLibrary.name}" 吗？这将清除所有用户答案并恢复到初始状态。`)) {
            const originalLibrary = JSON.parse(JSON.stringify(this.data.libraries[this.data.currentLibraryIndex]));
            delete originalLibrary.userAnswers;
            delete originalLibrary.originalOrder;
             
            this.data.libraries[this.data.currentLibraryIndex] = {
                name: originalLibrary.name,
                questions: JSON.parse(JSON.stringify(originalLibrary.questions)),
                userAnswers: {},
                originalOrder: []
            };
             
            this.data.currentIndex = 0;
            this.data.mode = 'practice';
            this.data.isShuffled = false;
             
            this.saveToStorage();
            this.updateUI();
            this.showToast('题库已重置', 'success');
        }
    }
};

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    quizApp.init();
});