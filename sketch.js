// 測驗系統變數
let quizTable; // 儲存從 CSV 載入的 p5.Table 物件
let questions = []; // 儲存處理後的題目物件陣列
let currentQuestionIndex = 0;
let wrongAnswerIndices = []; // 儲存答錯題目的索引
let currentReviewIndex = 0; // 目前正在查看的錯題索引
let score = 0;
let quizState = 'LOADING'; // 狀態機: LOADING, QUIZ, RESULT, REVIEW, ERROR
let selectedOption = -1; // -1: 未選, 0: A, 1: B, 2: C
let feedbackMessage = '';

// 游標特效變數
let trail = []; // 游標拖尾效果的座標陣列
const MAX_TRAIL_LENGTH = 15;

/**
 * 預載入：載入 CSV 檔案
 */
function preload() {
    // 必須使用 loadTable 函式來載入 CSV
    // 'csv': 檔案格式為 CSV
    // 'header': 檔案有標頭列
    quizTable = loadTable('questions.csv', 'csv', 'header');
}

/**
 * 設置：只執行一次
 */
function setup() {
    createCanvas(800, 600);
    textAlign(CENTER, CENTER);
    textSize(20);

    // 初始化 SCORM API
    if (scorm.init()) {
        console.log("SCORM 初始化成功！");
    } else {
        console.error("SCORM 初始化失敗！");
    }

    // 處理載入的 CSV 資料
    if (quizTable.getRowCount() > 0) {
        for (let r = 0; r < quizTable.getRowCount(); r++) {
            let row = quizTable.getRow(r);
            questions.push({
                question: row.getString('question'),
                options: [
                    row.getString('optionA'),
                    row.getString('optionB'),
                    row.getString('optionC')
                ],
                // 確保正確答案是數字
                correct: row.getNum('correct'),
                // 檢查 'explanation' 欄位是否存在，若不存在則給予空字串
                explanation: quizTable.columns.includes('explanation') ? row.getString('explanation') : ''
            });
        }
        quizState = 'QUIZ'; // 載入完成，進入測驗狀態
    } else {
        quizState = 'ERROR'; // 載入失敗或檔案為空
    }
}

// 在視窗關閉或離開頁面前，確保 SCORM 連線被終止
window.onbeforeunload = function() {
    scorm.quit();
};

/**
 * 繪圖迴圈
 */
function draw() {
    background(240);
    
    // 繪製游標拖尾特效 (所有狀態都可見)
    drawCursorTrail();

    switch (quizState) {
        case 'LOADING':
            drawLoadingScreen();
            break;
        case 'QUIZ':
            drawQuizScreen();
            break;
        case 'RESULT':
            drawResultScreen();
            break;
        case 'REVIEW':
            drawReviewScreen();
            break;
        case 'ERROR':
            drawErrorScreen();
            break;
    }
}

/**
 * 滑鼠點擊事件處理
 */
function mouseClicked() {
    if (quizState === 'QUIZ' && selectedOption === -1) { // 測驗中，尚未作答
        // 檢查是否點擊選項
        let optionHeight = 60;
        let startY = height / 2;
        let padding = 10;
        
        for (let i = 0; i < 3; i++) {
            let y = startY + i * (optionHeight + padding);
            // 假設選項區域為 (width/2 - 200, y, 400, optionHeight)
            if (mouseX > width / 2 - 200 && mouseX < width / 2 + 200 &&
                mouseY > y && mouseY < y + optionHeight) {
                
                selectedOption = i; // 標記選取的選項
                checkAnswer(); // 檢查答案並給予回饋
                return;
            }
        }
    } else if (quizState === 'QUIZ' && selectedOption !== -1) { // 測驗中，已作答
        // 檢查是否點擊了右下角的「下一題」按鈕
        let btnX = width - 60;
        let btnY = height - 60;
        let btnRadius = 30;
        if (dist(mouseX, mouseY, btnX, btnY) < btnRadius) {
            // 如果點擊在按鈕範圍內，則切換到下一題
            nextQuestion();
        }
    } else if (quizState === 'RESULT') { // 結果畫面
        // 檢查按鈕點擊
        let buttonWidth = 180;
        let buttonHeight = 50;
        let buttonY = height - 100;

        // 按鈕1: 再次挑戰
        let againButtonX = width / 2 - buttonWidth - 20;
        if (mouseX > againButtonX && mouseX < againButtonX + buttonWidth &&
            mouseY > buttonY && mouseY < buttonY + buttonHeight) {
            startNewQuiz(); // 👈 修正：呼叫 startNewQuiz() 來確保錯題紀錄被清除
        }

        // 按鈕2: 錯題解析
        let reviewButtonX = width / 2 + 20;
        if (mouseX > reviewButtonX && mouseX < reviewButtonX + buttonWidth &&
            mouseY > buttonY && mouseY < buttonY + buttonHeight) {
            if (wrongAnswerIndices.length > 0) {
                quizState = 'REVIEW';
                currentReviewIndex = 0; // 從第一題錯題開始
            } else {
                // 如果沒有錯題，可以給個提示
                console.log("沒有錯題可以解析！");
            }
        }
    } else if (quizState === 'REVIEW') { // 錯題解析畫面，處理按鈕點擊
        let buttonWidth = 120;
        let buttonHeight = 40;
        let buttonY = height - 60; // 👈 修正：與 drawReviewScreen 中的 Y 座標 (height - 60) 保持一致
        let buttonSpacing = 20; // 按鈕間距

        // 按鈕1: 上一題
        let prevButtonX = width / 2 - buttonWidth * 1.5 - buttonSpacing;
        // 只有在不是第一題錯題時才能點擊
        if (currentReviewIndex > 0 && mouseX > prevButtonX && mouseX < prevButtonX + buttonWidth &&
            mouseY > buttonY && mouseY < buttonY + buttonHeight) {
            prevReviewQuestion();
            return;
        }

        // 按鈕2: 返回結果
        let backButtonX = width / 2 - buttonWidth / 2;
        if (mouseX > backButtonX && mouseX < backButtonX + buttonWidth &&
            mouseY > buttonY && mouseY < buttonY + buttonHeight) {
            quizState = 'RESULT';
            return;
        }

        // 按鈕3: 下一題
        let nextButtonX = width / 2 + buttonWidth / 2 + buttonSpacing;
        // 只有在不是最後一題錯題時才能點擊
        if (currentReviewIndex < wrongAnswerIndices.length - 1 && mouseX > nextButtonX && mouseX < nextButtonX + buttonWidth &&
            mouseY > buttonY && mouseY < buttonY + buttonHeight) {
            nextReviewQuestion();
            return;
        }
        
        // 如果點擊了其他地方，但沒有點擊按鈕，則不執行任何操作
        // 這樣可以避免誤觸返回結果畫面
    }
}

/**
 * 繪製游標拖尾特效
 */
function drawCursorTrail() {
    // 將當前滑鼠位置加入拖尾陣列
    trail.push({x: mouseX, y: mouseY});
    // 限制拖尾長度
    if (trail.length > MAX_TRAIL_LENGTH) {
        trail.shift();
    }

    noFill();
    for (let i = 0; i < trail.length; i++) {
        let pos = trail[i];
        let diameter = map(i, 0, trail.length - 1, 5, 20); // 尾巴直徑變小
        let alpha = map(i, 0, trail.length - 1, 50, 200); // 尾巴透明度變淡
        
        // 根據當前分數或狀態改變顏色，作為隱藏的特效
        let r, g, b;
        if (quizState === 'RESULT') {
             // 根據分數高低顯示不同顏色
             let goodScore = score >= questions.length * 0.7;
             r = goodScore ? 50 : 255;
             g = goodScore ? 200 : 100;
             b = goodScore ? 255 : 100;
        } else {
             // 測驗中預設顏色
             r = 100; g = 150; b = 255;
        }

        stroke(r, g, b, alpha);
        strokeWeight(2);
        ellipse(pos.x, pos.y, diameter, diameter);
    }
}

/**
 * 繪製單個選項按鈕 (包含點選特效)
 *
 * ***【重要修正】***
 * 將第一個參數 'text' 更名為 'optionText'，避免與 p5.js 的全域 text() 函式衝突。
 * * @param {string} optionText 選項文字
 * @param {number} x X 座標
 * @param {number} y Y 座標
 * @param {number} w 寬度
 * @param {number} h 高度
 * @param {number} index 選項索引 (0, 1, 2)
 */
function drawOption(optionText, x, y, w, h, index) { // 👈 修正: text -> optionText
    let current = questions[currentQuestionIndex];
    let isHover = mouseX > x && mouseX < x + w && mouseY > y && mouseY < y + h;
    
    // 預設顏色
    let rectColor = color(255);
    let textColor = color(50);
    
    // 選項特效：滑鼠懸停
    if (isHover && selectedOption === -1) {
        rectColor = color(200, 220, 255);
        cursor(HAND); // 更改游標為手型
    } else if (selectedOption === -1) {
        cursor(ARROW); // 預設游標
    }

    // 作答後的回饋特效
    if (selectedOption !== -1) {
        cursor(ARROW);
        if (index === current.correct) {
            // 正確答案 (綠色)
            rectColor = color(150, 255, 150);
        } else if (index === selectedOption) {
            // 錯誤選取 (紅色)
            rectColor = color(255, 150, 150);
        }
    }
    
    // 繪製按鈕
    fill(rectColor);
    stroke(100);
    rect(x, y, w, h, 10); // 圓角矩形

    // 繪製文字
    fill(textColor);
    text(optionText, x + w / 2, y + h / 2); // 👈 修正: text -> optionText
    
    // 選取選項時的動態「波動」特效
    if (index === selectedOption && selectedOption !== -1) {
        let waveTime = millis() * 0.005;
        let waveSize = sin(waveTime) * 5 + 5; // 5到10之間的波動
        noFill();
        strokeWeight(waveSize);
        stroke(255, 150); // 白色半透明
        rect(x, y, w, h, 10);
    }
}

/**
 * 繪製進度條和星星
 */
function drawProgressBar() {
    // 總問題數
    const totalQuestions = questions.length;
    if (totalQuestions === 0) return; // 如果沒有題目則不繪製

    // 進度條尺寸與位置
    const barWidth = 400;
    const barHeight = 20;
    const x = width / 2 - barWidth / 2;
    const y = 40; // 從頂部往下 40px

    // 1. 繪製進度條背景
    fill(220); // 淺灰色
    noStroke();
    rect(x, y, barWidth, barHeight, 10); // 圓角矩形

    // 2. 繪製目前進度的長條
    const progressWidth = (currentQuestionIndex / totalQuestions) * barWidth;
    if (progressWidth > 0) {
        fill(76, 175, 80); // 綠色
        rect(x, y, progressWidth, barHeight, 10);
    }

    // 3. 繪製星星
    const starY = y - 5; // 星星位於進度條正上方
    for (let i = 0; i < totalQuestions; i++) {
        const starX = x + (barWidth / totalQuestions) * (i + 0.5);
        const starColor = (i < currentQuestionIndex) ? color(255, 215, 0) : color(189, 189, 189); // 金色 vs 灰色
        fill(starColor);
        textSize(25);
        text('★', starX, starY);
    }
}

/**
 * 繪製測驗畫面
 */
function drawQuizScreen() {
    let current = questions[currentQuestionIndex];
    
    // 繪製題目
    fill(50);
    // 繪製進度條
    drawProgressBar();

    textSize(24);
    text(`第${currentQuestionIndex + 1}題`, width / 2, height / 4 - 30);
    textSize(28);
    text(current.question, width / 2, height / 4 + 20);

    // 繪製選項
    let optionHeight = 60;
    let startY = height / 2;
    let padding = 10;
    
    for (let i = 0; i < current.options.length; i++) {
        let y = startY + i * (optionHeight + padding);
        // 傳遞選項文字 (current.options[i]) 給 drawOption
        drawOption(current.options[i], width / 2 - 200, y, 400, optionHeight, i);
    }

    // 繪製作答回饋訊息
    if (selectedOption !== -1) {
        textSize(24);
        fill(currentQuestionIndex < questions.length ? 50 : 150, 50, 200);
        text(feedbackMessage, width / 2, height - 80);
        
        // --- 繪製右下角的「下一題」按鈕 ---
        let btnX = width - 60;
        let btnY = height - 60;
        let btnRadius = 30;
        let isHover = dist(mouseX, mouseY, btnX, btnY) < btnRadius;

        // 根據滑鼠懸停狀態改變顏色和游標
        if (isHover) {
            fill(243, 156, 18); // 懸停時的亮橘色
            cursor(HAND);
        } else {
            fill(230, 126, 34); // 預設的橘色
        }

        // 繪製按鈕
        noStroke();
        ellipse(btnX, btnY, btnRadius * 2, btnRadius * 2); // 圓形背景
        fill(255); // 白色箭頭
        triangle(btnX - 10, btnY - 15, btnX - 10, btnY + 15, btnX + 15, btnY); // 向右的三角形
    }
}

/**
 * 檢查答案並更新分數和回饋
 */
function checkAnswer() {
    let current = questions[currentQuestionIndex];
    if (selectedOption === current.correct) {
        score++;
        feedbackMessage = "✅ 答對了！太棒了！";
    } else {
        feedbackMessage = "❌ 答錯了。正確答案是 " + current.options[current.correct] + "。";
        wrongAnswerIndices.push(currentQuestionIndex);
    }
}

/**
 * 切換到下一題或結果畫面
 */
function nextQuestion() {
    currentQuestionIndex++;
    selectedOption = -1; // 重置選項
    feedbackMessage = '';
    
    if (currentQuestionIndex >= questions.length) {
        quizState = 'RESULT'; // 測驗結束
    }
}

/**
 * 繪製結果畫面（動態回饋動畫）
 */
function drawResultScreen() {
    let finalScore = score;
    let totalQuestions = questions.length;
    let totalScore = finalScore * 20; // 每題 20 分
    let percentage = (finalScore / totalQuestions);

    let topMessage = "";
    let bottomMessage = "";
    let colorA, colorB;
    let animationSpeed = frameCount * 0.05;

    // 根據成績產生不同的動畫和訊息
    if (percentage >= 0.8) {
        // 稱讚的畫面：高分 (例如：紙屑/星星雨)
        topMessage = "🎉 恭喜你！";
        bottomMessage = "你真是太厲害了！";
        colorA = color(255, 200, 50); // 金色
        colorB = color(255, 100, 200); // 粉色
        drawConfetti(colorA, colorB, 50);

    } else if (percentage >= 0.5) {
        // 中等成績：鼓勵的畫面 (例如：溫和的脈衝波)
        topMessage = "👍 做得好！";
        bottomMessage = "繼續努力！";
        colorA = color(100, 150, 255); // 藍色
        colorB = color(150, 255, 100); // 綠色
        drawPulse(colorA, 100, 50);

    } else {
        // 低分：更強烈的鼓勵 (例如：向上箭頭或小火焰)
        topMessage = "💪 加油！";
        bottomMessage = "下次會更好！";
        colorA = color(255, 150, 100); // 橘色
        colorB = color(200, 100, 255); // 紫色
        drawEncouragementArrows(colorA, 5);
    }

    // 繪製頂部訊息
    fill(50);
    textSize(28);
    text(topMessage, width / 2, height / 2 - 120);

    // 以醒目的方式在畫面中央繪製分數
    fill('#ad2831'); // 使用指定的顏色以突顯
    textSize(128);
    text(`${totalScore}`, width / 2, height / 2);

    // 繪製底部訊息
    fill(50);
    textSize(28);
    text(bottomMessage, width / 2, height / 2 + 120);
    
    // --- 繪製兩個功能按鈕 ---
    let buttonWidth = 180;
    let buttonHeight = 50;
    let buttonY = height - 100;

    // 按鈕1: 再次挑戰
    let againButtonX = width / 2 - buttonWidth - 20;
    let isHoverAgain = mouseX > againButtonX && mouseX < againButtonX + buttonWidth && mouseY > buttonY && mouseY < buttonY + buttonHeight;
    fill(isHoverAgain ? color(100, 180, 255) : color(100, 150, 255));
    stroke(255);
    strokeWeight(2);
    rect(againButtonX, buttonY, buttonWidth, buttonHeight, 10);
    fill(255);
    noStroke();
    textSize(22);
    text("再次挑戰", againButtonX + buttonWidth / 2, buttonY + buttonHeight / 2);

    // 按鈕2: 錯題解析
    let reviewButtonX = width / 2 + 20;
    // 如果沒有錯題，按鈕變為灰色且不可點擊
    if (wrongAnswerIndices.length > 0) {
        let isHoverReview = mouseX > reviewButtonX && mouseX < reviewButtonX + buttonWidth && mouseY > buttonY && mouseY < buttonY + buttonHeight;
        fill(isHoverReview ? color(120, 220, 120) : color(76, 175, 80));
        cursor(isHoverAgain || isHoverReview ? HAND : ARROW);
    } else {
        fill(180); // 灰色
        cursor(isHoverAgain ? HAND : ARROW);
    }
    stroke(255);
    strokeWeight(2);
    rect(reviewButtonX, buttonY, buttonWidth, buttonHeight, 10);
    fill(255);
    noStroke();
    textSize(22);
    text("錯題解析", reviewButtonX + buttonWidth / 2, buttonY + buttonHeight / 2);
}

/**
 * 繪製紙屑/星星雨動畫 (高分)
 * @param {p5.Color} color1 顏色 1
 * @param {p5.Color} color2 顏色 2
 * @param {number} count 數量
 */
let confetti = [];
function drawConfetti(color1, color2, count) {
    if (confetti.length < count) {
        // 隨機產生紙屑
        confetti.push({
            x: random(width),
            y: random(-height, 0),
            speed: random(1, 5),
            color: random() > 0.5 ? color1 : color2,
            size: random(5, 15),
            rotation: random(TWO_PI)
        });
    }

    for (let i = confetti.length - 1; i >= 0; i--) {
        let p = confetti[i];
        
        // 更新位置
        p.y += p.speed;
        p.rotation += 0.05;

        // 繪製紙屑 (旋轉矩形模擬)
        push();
        translate(p.x, p.y);
        rotate(p.rotation);
        fill(p.color);
        noStroke();
        rect(0, 0, p.size, p.size / 2);
        pop();

        // 移除超出畫布的紙屑
        if (p.y > height) {
            confetti.splice(i, 1);
        }
    }
}

/**
 * 繪製溫和的脈衝波動畫 (中等成績)
 * @param {p5.Color} baseColor 基底顏色
 * @param {number} maxRadius 最大半徑
 * @param {number} speed 速度
 */
function drawPulse(baseColor, maxRadius, speed) {
    let t = (millis() * 0.001 * speed) % 100; // 0 到 100 之間循環
    let radius = map(t, 0, 100, 0, maxRadius);
    let alpha = map(t, 0, 100, 200, 0); // 隨著半徑擴大而變透明

    noFill();
    stroke(red(baseColor), green(baseColor), blue(baseColor), alpha);
    strokeWeight(10);
    
    // 繪製兩個不同速度的脈衝波
    ellipse(width / 2, height / 2, radius * 2, radius * 2);
    
    let t2 = (millis() * 0.001 * speed + 50) % 100;
    let radius2 = map(t2, 0, 100, 0, maxRadius * 1.5);
    let alpha2 = map(t2, 0, 100, 200, 0);
    stroke(red(baseColor), green(baseColor), blue(baseColor), alpha2);
    strokeWeight(5);
    ellipse(width / 2, height / 2, radius2 * 2, radius2 * 2);
}

/**
 * 繪製向上鼓勵箭頭動畫 (低分)
 * @param {p5.Color} color 顏色
 * @param {number} count 箭頭數量
 */
function drawEncouragementArrows(color, count) {
    for (let i = 0; i < count; i++) {
        let x = width / 2 + (i - (count - 1) / 2) * 80;
        let speed = 2 + (i % 2) * 1; // 錯開速度
        let yOffset = (frameCount * speed) % (height / 2); // 循環移動
        
        // 箭頭的主體 Y 座標
        let arrowY = height * 0.7 - yOffset;
        let alpha = map(arrowY, height * 0.7, height * 0.7 - height / 2, 255, 0);

        fill(red(color), green(color), blue(color), alpha);
        noStroke();

        // 繪製三角形箭頭
        push();
        translate(x, arrowY);
        triangle(-20, 0, 20, 0, 0, -40); // 尖端向上
        rect(-5, 0, 10, 50); // 箭頭的柄
        pop();
    }
}


/**
 * 重置測驗狀態
 */
function resetQuiz() {
    currentQuestionIndex = 0;
    score = 0;
    selectedOption = -1;
    feedbackMessage = '';
    confetti = []; // 清空紙屑
    quizState = 'QUIZ';
}

/**
 * 開始一個全新的測驗，會清除所有紀錄
 */
function startNewQuiz() {
    wrongAnswerIndices = []; // 只在這裡清除錯題紀錄
    resetQuiz();
}

// Helper functions for review navigation
function nextReviewQuestion() {
    currentReviewIndex++;
    if (currentReviewIndex >= wrongAnswerIndices.length) {
        currentReviewIndex = wrongAnswerIndices.length - 1; // 停留在最後一題
    }
}

function prevReviewQuestion() {
    currentReviewIndex--;
    if (currentReviewIndex < 0) {
        currentReviewIndex = 0; // 停留在第一題
    }
}

/**
 * 繪製錯題解析畫面
 */
function drawReviewScreen() {
    // 確保 currentReviewIndex 在有效範圍內

    currentReviewIndex = constrain(currentReviewIndex, 0, wrongAnswerIndices.length - 1);

    background(240, 245, 255); // 使用淡藍色背景

    if (wrongAnswerIndices.length === 0) {
        fill(50);
        textSize(32);
        text("沒有錯題可以解析！", width / 2, height / 2);
        return;
    }

    // 繪製進度條
    drawReviewProgressBar();

    // 取得目前要解析的錯題
    let questionToReviewIndex = wrongAnswerIndices[currentReviewIndex];
    let q = questions[questionToReviewIndex];

   // 繪製題目
    fill(100);
    textSize(20);
    text('錯題回顧進度', width / 2, 40);

    fill(50);
    textSize(24);
    text(`第${questionToReviewIndex + 1}題`, width / 2, height / 4 - 30);
    textSize(28);
    text(q.question, width / 2, height / 4 + 20);
    
    // 繪製所有選項，並標示出正確答案 (調整起始 Y 座標和選項高度)
    let optionHeight = 50; // 縮小選項高度
    let startY = height / 2 - 50; // 向上移動更多，為解析和按鈕騰出空間
    let padding = 10;
    for (let i = 0; i < q.options.length; i++) {
        let y = startY + i * (optionHeight + padding);
        fill(i === q.correct ? color(150, 255, 150) : color(255)); // 正確答案顯示為綠色
        stroke(100);

        rect(width / 2 - 200, y, 400, optionHeight, 10);
        fill(50);
        text(q.options[i], width / 2, y + optionHeight / 2);
    }

    // --- 新增：繪製單字解析 ---
    // 檢查是否有解析內容
    if (q.explanation && q.explanation.trim() !== '') {
        let explanationY = height - 180; // 解析文字的起始 Y 座標 (向下移動 20px)

        fill(0, 102, 153); // 使用深藍色標題
        textSize(20);
        textAlign(LEFT, TOP); // 改為左上對齊以方便顯示長文字
        text("單字解析：", 50, explanationY);

        fill(50); // 內文顏色
        textSize(18);
        // 使用 text() 的邊界參數來自動換行
        text(q.explanation, 50, explanationY + 30, width - 100, 60); // 調整可用高度
        textAlign(CENTER, CENTER); // 恢復預設的置中對齊
    }

    // --- 繪製導航按鈕和返回按鈕 ---
    let buttonWidth = 120;
    let buttonHeight = 40;
    let buttonY = height - 60; // 所有按鈕統一的 Y 座標 (向下移動 20px)
    let buttonSpacing = 20; // 按鈕間距

    // 按鈕1: 上一題
    let isPrevDisabled = currentReviewIndex === 0;
    let prevButtonX = width / 2 - buttonWidth * 1.5 - buttonSpacing;
    let isHoverPrev = !isPrevDisabled && mouseX > prevButtonX && mouseX < prevButtonX + buttonWidth && mouseY > buttonY && mouseY < buttonY + buttonHeight;
    
    if (isPrevDisabled) {
        fill(180); // 灰色
    } else {
        fill(isHoverPrev ? color(150, 200, 255) : color(100, 150, 255)); // 藍色系
    }
    stroke(255);
    strokeWeight(2);
    rect(prevButtonX, buttonY, buttonWidth, buttonHeight, 10);
    fill(255);
    noStroke();
    textSize(20);
    text("上一題", prevButtonX + buttonWidth / 2, buttonY + buttonHeight / 2);

    // 按鈕2: 返回結果
    let backButtonX = width / 2 - buttonWidth / 2;
    let isHoverBack = mouseX > backButtonX && mouseX < backButtonX + buttonWidth && mouseY > buttonY && mouseY < buttonY + buttonHeight;
    fill(isHoverBack ? color(255, 180, 180) : color(255, 100, 100)); // 紅色系
    stroke(255);
    strokeWeight(2);
    rect(backButtonX, buttonY, buttonWidth, buttonHeight, 10);
    fill(255);
    noStroke();
    textSize(20);
    text("返回結果", backButtonX + buttonWidth / 2, buttonY + buttonHeight / 2);

    // 按鈕3: 下一題
    let isNextDisabled = currentReviewIndex >= wrongAnswerIndices.length - 1;
    let nextButtonX = width / 2 + buttonWidth / 2 + buttonSpacing;
    let isHoverNext = !isNextDisabled && mouseX > nextButtonX && mouseX < nextButtonX + buttonWidth && mouseY > buttonY && mouseY < buttonY + buttonHeight;

    if (isNextDisabled) {
        fill(180); // 灰色
    } else {
        fill(isHoverNext ? color(150, 255, 150) : color(76, 175, 80)); // 綠色系
    }
    stroke(255);
    strokeWeight(2);
    rect(nextButtonX, buttonY, buttonWidth, buttonHeight, 10);
    fill(255);
    noStroke();
    textSize(20);
    text("下一題", nextButtonX + buttonWidth / 2, buttonY + buttonHeight / 2);

    // 根據滑鼠是否懸停在按鈕上來改變游標樣式
    cursor(isHoverPrev || isHoverNext || isHoverBack ? HAND : ARROW);
}

/**
 * 繪製錯題回顧的進度條
 */
function drawReviewProgressBar() {
    // 總錯題數
    const totalWrongQuestions = wrongAnswerIndices.length;

    // 進度條尺寸與位置
    const barWidth = 300;
    const barHeight = 15;
    const x = width / 2 - barWidth / 2;
    const y = 70; // 調整 Y 座標

    // 1. 繪製進度條背景
    fill(220);
    noStroke();
    rect(x, y, barWidth, barHeight, 10);

    // 2. 繪製目前進度的長條
    const progressWidth = ((currentReviewIndex + 1) / totalWrongQuestions) * barWidth;
    fill(255, 150, 100); // 橘色
    rect(x, y, progressWidth, barHeight, 10);
}


/**
 * 繪製載入畫面
 */
function drawLoadingScreen() {
    fill(50);
    textSize(32);
    text("載入題庫中...", width / 2, height / 2);
}

/**
 * 繪製錯誤畫面
 */
function drawErrorScreen() {
    fill(200, 50, 50);
    textSize(32);
    text("⚠️ 題庫載入失敗或為空！請檢查 questions.csv 檔案。", width / 2, height / 2);
}