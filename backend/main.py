from fastapi import FastAPI

app = FastAPI(title="SecGen-Assistant")


@app.get("/health")
def health_check():
    pass
