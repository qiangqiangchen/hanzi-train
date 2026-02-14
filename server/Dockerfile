FROM python:3.12-slim

WORKDIR /app

# 安装依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制代码
COPY . .

# 创建必要目录
RUN mkdir -p static/audio/scenario data

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["python", "main.py"]