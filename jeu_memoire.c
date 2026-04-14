#include "raylib.h"
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <string.h>

#define MAX_CARDS 24

typedef struct {
    int id;
    bool isFlipped;
    bool isMatched;
    Rectangle rect;
    Color color;
} Card;

Card cards[MAX_CARDS];
int numCards = 16;
int flippedCount = 0;
int firstFlipped = -1;
int secondFlipped = -1;
int matchedPairs = 0;
int moves = 0;
float gameStartTime = 0.0f;
float currentTime = 0.0f;
bool gameStarted = false;
bool gameOver = false;
bool waitFlag = false;
float waitTimer = 0.0f;

Color cardColors[] = { RED, BLUE, GREEN, YELLOW, PURPLE, ORANGE, MAGENTA, LIME, PINK, SKYBLUE, VIOLET, DARKGREEN };

void InitGame(int difficulty) {
    numCards = difficulty;
    matchedPairs = 0;
    moves = 0;
    flippedCount = 0;
    firstFlipped = -1;
    secondFlipped = -1;
    gameStarted = false;
    gameOver = false;
    gameStartTime = GetTime();
    currentTime = 0.0f;
    waitFlag = false;

    int cols = (numCards == 8) ? 4 : ((numCards == 16) ? 4 : 6);
    int rows = numCards / cols;
    int cellWidth = 80;
    int cellHeight = 80;
    int padding = 10;
    int startX = (GetScreenWidth() - (cols * cellWidth + (cols - 1) * padding)) / 2;
    int startY = 150;

    int pairs[12]; // max 12 pairs for 24 cards
    for (int i = 0; i < numCards / 2; i++) {
        pairs[i] = i;
    }

    // Assign cards
    int cIndex = 0;
    for (int i = 0; i < numCards / 2; i++) {
        for (int j = 0; j < 2; j++) {
            cards[cIndex].id = pairs[i];
            cards[cIndex].isFlipped = false;
            cards[cIndex].isMatched = false;
            cards[cIndex].color = cardColors[pairs[i]];
            cIndex++;
        }
    }

    // Shuffle
    for (int i = numCards - 1; i > 0; i--) {
        int j = GetRandomValue(0, i);
        Card temp = cards[i];
        cards[i] = cards[j];
        cards[j] = temp;
    }

    // Set positions
    for (int i = 0; i < numCards; i++) {
        int r = i / cols;
        int c = i % cols;
        cards[i].rect.x = startX + c * (cellWidth + padding);
        cards[i].rect.y = startY + r * (cellHeight + padding);
        cards[i].rect.width = cellWidth;
        cards[i].rect.height = cellHeight;
    }
}

int main(void) {
    const int screenWidth = 600;
    const int screenHeight = 600;
    InitWindow(screenWidth, screenHeight, "Jeu de Memoire - C / Raylib");
    SetTargetFPS(60);
    SetRandomSeed(time(NULL));

    InitGame(16);

    Rectangle btn8 = { 50, 80, 100, 30 };
    Rectangle btn16 = { 160, 80, 100, 30 };
    Rectangle btn24 = { 270, 80, 100, 30 };
    Rectangle btnRestart = { 450, 80, 100, 30 };

    while (!WindowShouldClose()) {
        Vector2 mousePoint = GetMousePosition();
        
        if (!waitFlag && !gameOver) {
            if (IsMouseButtonPressed(MOUSE_LEFT_BUTTON)) {
                // Check difficulty / restart buttons
                if (CheckCollisionPointRec(mousePoint, btn8)) InitGame(8);
                if (CheckCollisionPointRec(mousePoint, btn16)) InitGame(16);
                if (CheckCollisionPointRec(mousePoint, btn24)) InitGame(24);
                if (CheckCollisionPointRec(mousePoint, btnRestart)) InitGame(numCards);

                for (int i = 0; i < numCards; i++) {
                    if (CheckCollisionPointRec(mousePoint, cards[i].rect) && !cards[i].isFlipped && !cards[i].isMatched) {
                        if (!gameStarted) {
                            gameStarted = true;
                            gameStartTime = GetTime();
                        }
                        
                        cards[i].isFlipped = true;
                        flippedCount++;

                        if (flippedCount == 1) {
                            firstFlipped = i;
                        } else if (flippedCount == 2) {
                            secondFlipped = i;
                            moves++;
                            waitFlag = true;
                            waitTimer = GetTime();
                        }
                    }
                }
            }
        }

        if (waitFlag) {
            if (GetTime() - waitTimer > 0.8f) { // wait 800ms
                if (cards[firstFlipped].id == cards[secondFlipped].id) {
                    cards[firstFlipped].isMatched = true;
                    cards[secondFlipped].isMatched = true;
                    matchedPairs++;
                    if (matchedPairs == numCards / 2) {
                        gameOver = true;
                    }
                } else {
                    cards[firstFlipped].isFlipped = false;
                    cards[secondFlipped].isFlipped = false;
                }
                flippedCount = 0;
                firstFlipped = -1;
                secondFlipped = -1;
                waitFlag = false;
            }
        }

        if (gameStarted && !gameOver) {
            currentTime = GetTime() - gameStartTime;
        }

        BeginDrawing();
        ClearBackground(DARKBLUE);

        DrawText("Jeu de Memoire", 180, 20, 30, WHITE);
        
        char statsStr[100];
        sprintf(statsStr, "Temps: %02d:%02d   Coups: %d", (int)currentTime / 60, (int)currentTime % 60, moves);
        DrawText(statsStr, 50, 55, 20, YELLOW);

        DrawRectangleRec(btn8, (numCards == 8) ? DARKGRAY : LIGHTGRAY);
        DrawText("8 Cartes", 70, 85, 15, BLACK);
        DrawRectangleRec(btn16, (numCards == 16) ? DARKGRAY : LIGHTGRAY);
        DrawText("16 Cartes", 180, 85, 15, BLACK);
        DrawRectangleRec(btn24, (numCards == 24) ? DARKGRAY : LIGHTGRAY);
        DrawText("24 Cartes", 290, 85, 15, BLACK);
        
        DrawRectangleRec(btnRestart, RED);
        DrawText("Rejouer", 470, 85, 15, WHITE);

        for (int i = 0; i < numCards; i++) {
            if (cards[i].isMatched) {
                DrawRectangleRec(cards[i].rect, cards[i].color);
            } else if (cards[i].isFlipped) {
                DrawRectangleRec(cards[i].rect, cards[i].color);
            } else {
                DrawRectangleRec(cards[i].rect, SKYBLUE);
            }
            DrawRectangleLinesEx(cards[i].rect, 2.0f, BLACK);
        }

        if (gameOver) {
            DrawRectangle(0, 0, screenWidth, screenHeight, Fade(BLACK, 0.7f));
            DrawText("Victoire !", 200, 250, 40, GREEN);
            char winStr[100];
            sprintf(winStr, "Coups: %d | Temps: %02d:%02d", moves, (int)currentTime / 60, (int)currentTime % 60);
            DrawText(winStr, 150, 310, 20, WHITE);
            DrawText("Cliquez sur Rejouer pour relancer", 130, 350, 20, GRAY);
            
            if (IsMouseButtonPressed(MOUSE_LEFT_BUTTON) && CheckCollisionPointRec(mousePoint, btnRestart)) {
                InitGame(numCards);
            }
        }

        EndDrawing();
    }

    CloseWindow();
    return 0;
}