import tkinter as tk
from tkinter import ttk

class QuizApp:
    """一個包含進度條的測驗應用程式範例"""

    def __init__(self, root, total_questions):
        self.root = root
        self.total_questions = total_questions
        self.current_question_index = 0

        self.root.title("測驗進度條範例")
        self.root.geometry("600x400")
        self.root.configure(bg="#F0F0F0")

        # --- 進度條和星星 ---
        # 使用一個 Frame 來容納 Canvas，使其更容易在頂部居中
        progress_frame = tk.Frame(root, bg="#F0F0F0")
        # pady 增加框架與視窗頂部的距離
        progress_frame.pack(pady=20)

        # Canvas 用於繪製自訂的進度條和星星
        self.canvas_width = 400
        self.canvas_height = 50
        self.progress_canvas = tk.Canvas(
            progress_frame,
            width=self.canvas_width,
            height=self.canvas_height,
            bg="#F0F0F0",
            highlightthickness=0 # 移除畫布邊框
        )
        self.progress_canvas.pack()

        # --- 模擬測驗內容的控制按鈕 ---
        self.question_label = tk.Label(root, text=f"問題 {self.current_question_index + 1}", font=("Helvetica", 16), bg="#F0F0F0")
        self.question_label.pack(pady=30)

        control_frame = tk.Frame(root, bg="#F0F0F0")
        control_frame.pack(pady=20)

        self.next_button = ttk.Button(control_frame, text="下一題", command=self.next_question)
        self.next_button.pack(side=tk.LEFT, padx=10)

        self.reset_button = ttk.Button(control_frame, text="重置", command=self.reset_quiz)
        self.reset_button.pack(side=tk.LEFT, padx=10)

        # 初始繪製進度條
        self.update_progress()

    def update_progress(self):
        """根據目前的進度更新進度條和星星"""
        self.progress_canvas.delete("all") # 清除畫布上的所有舊圖形

        bar_y = 30  # 進度條的 Y 座標
        bar_height = 20

        # 1. 繪製進度條背景
        self.progress_canvas.create_rectangle(
            0, bar_y, self.canvas_width, bar_y + bar_height,
            fill="#E0E0E0", # 淺灰色背景
            outline=""
        )

        # 2. 繪製目前進度的長條
        progress_width = (self.current_question_index / self.total_questions) * self.canvas_width
        if progress_width > 0:
            self.progress_canvas.create_rectangle(
                0, bar_y, progress_width, bar_y + bar_height,
                fill="#4CAF50", # 綠色進度
                outline=""
            )

        # 3. 繪製星星
        star_y = 15 # 星星的 Y 座標 (在進度條上方)
        for i in range(self.total_questions):
            # 計算每顆星星的中心 X 座標
            star_x = (self.canvas_width / self.total_questions) * (i + 0.5)
            
            # 如果問題已完成，星星變為金色；否則為灰色
            star_color = "#FFD700" if i < self.current_question_index else "#BDBDBD"
            
            self.progress_canvas.create_text(
                star_x, star_y, text="★", font=("Arial", 20), fill=star_color
            )

    def next_question(self):
        """前進到下一題並更新進度"""
        if self.current_question_index < self.total_questions:
            self.current_question_index += 1
            self.update_progress()
            # 更新問題標籤，如果測驗結束則顯示完成
            if self.current_question_index < self.total_questions:
                self.question_label.config(text=f"問題 {self.current_question_index + 1}")
            else:
                self.question_label.config(text="測驗完成！")

    def reset_quiz(self):
        """重置測驗進度"""
        self.current_question_index = 0
        self.update_progress()
        self.question_label.config(text=f"問題 {self.current_question_index + 1}")

if __name__ == "__main__":
    main_window = tk.Tk()
    # 根據您的 CSV 檔案，總共有 5 個問題
    app = QuizApp(main_window, total_questions=5)
    main_window.mainloop()