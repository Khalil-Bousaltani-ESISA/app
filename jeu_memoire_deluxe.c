#include <windows.h>
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <stdbool.h>
#include <math.h>

#define MAX_CARDS 24
#define ID_BTN_8 1001
#define ID_BTN_16 1002
#define ID_BTN_24 1003
#define ID_BTN_RESTART 1004
#define ID_CHK_TIME 1005
#define ID_BTN_MENU 1006

#define TIMER_TICK 1
#define TIMER_FLIP_BACK 2
#define TIMER_ANIM 3

typedef struct {
    int id;
    bool isFlipped;
    bool isMatched;
    RECT rect;
    COLORREF color;
    char text[4];
    
    // Animation properties
    float animScale; // 1.0 (full) to 0.0 (edge)
    float targetScale;
    bool isAnimating;
} Card;

Card cards[MAX_CARDS];
int numCards = 16;
int flippedCount = 0;
int firstFlipped = -1;
int secondFlipped = -1;
int matchedPairs = 0;
int moves = 0;

DWORD gameStartTime = 0;
DWORD currentTimeStr = 0;
int timeLimit = 60; // seconds for time attack
bool timeAttackMode = false;

bool gameStarted = false;
bool gameOver = false;
bool waitFlag = false;

typedef enum {
    SCREEN_MENU,
    SCREEN_GAME
} ScreenState;

ScreenState currentScreen = SCREEN_MENU;

COLORREF cardColors[] = {
    RGB(255, 69, 0),    // OrangeRed
    RGB(30, 144, 255),  // DodgerBlue
    RGB(50, 205, 50),   // LimeGreen
    RGB(255, 215, 0),   // Gold
    RGB(138, 43, 226),  // BlueViolet
    RGB(255, 20, 147),  // DeepPink
    RGB(0, 206, 209),   // DarkTurquoise
    RGB(255, 140, 0),   // DarkOrange
    RGB(199, 21, 133),  // MediumVioletRed
    RGB(100, 149, 237), // CornflowerBlue
    RGB(154, 205, 50),  // YellowGreen
    RGB(178, 34, 34)    // Firebrick
};
char* cardSymbols[] = {"A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"};

int bestScores[3] = {999, 999, 999}; // Best moves for 8, 16, 24
const char* SCORE_FILE = "scores.txt";

HWND hwndMain;
HWND hBtn8, hBtn16, hBtn24, hBtnRestart, hChkTime, hBtnMenu;
HFONT hUiFont = NULL;
HFONT hUiFontSmall = NULL;
int selectedDifficulty = 16;
bool menuTimeAttackEnabled = false;
int hoverDifficulty = -1;
bool hoverPlay = false;
bool hoverToggle = false;
float uiPulse = 0.0f;
RECT menuPanelRect;
RECT menuDiffRects[3];
RECT menuPlayRect;
RECT menuToggleRect;

void UpdateMenuLayout(HWND hwnd) {
    RECT rc;
    GetClientRect(hwnd, &rc);

    int panelW = 560;
    int panelH = 410;
    int panelX = (rc.right - panelW) / 2;
    int panelY = 180;

    menuPanelRect.left = panelX;
    menuPanelRect.top = panelY;
    menuPanelRect.right = panelX + panelW;
    menuPanelRect.bottom = panelY + panelH;

    int cardW = 150;
    int cardH = 90;
    int gap = 20;
    int cardsStartX = panelX + 35;
    int cardsY = panelY + 120;

    for (int i = 0; i < 3; ++i) {
        menuDiffRects[i].left = cardsStartX + i * (cardW + gap);
        menuDiffRects[i].top = cardsY;
        menuDiffRects[i].right = menuDiffRects[i].left + cardW;
        menuDiffRects[i].bottom = menuDiffRects[i].top + cardH;
    }

    menuToggleRect.left = panelX + 35;
    menuToggleRect.top = panelY + 235;
    menuToggleRect.right = panelX + 285;
    menuToggleRect.bottom = panelY + 275;

    menuPlayRect.left = panelX + panelW - 210;
    menuPlayRect.top = panelY + 226;
    menuPlayRect.right = panelX + panelW - 35;
    menuPlayRect.bottom = panelY + 285;
}

void UpdateControlsVisibility() {
    if (currentScreen == SCREEN_MENU) {
        ShowWindow(hBtn8, SW_HIDE);
        ShowWindow(hBtn16, SW_HIDE);
        ShowWindow(hBtn24, SW_HIDE);
        ShowWindow(hChkTime, SW_HIDE);
        ShowWindow(hBtnRestart, SW_HIDE);
        ShowWindow(hBtnMenu, SW_HIDE);
    } else {
        ShowWindow(hBtn8, SW_HIDE);
        ShowWindow(hBtn16, SW_HIDE);
        ShowWindow(hBtn24, SW_HIDE);
        ShowWindow(hChkTime, SW_HIDE);
        ShowWindow(hBtnRestart, SW_SHOW);
        ShowWindow(hBtnMenu, SW_SHOW);
    }
}

void FillVerticalGradient(HDC hdc, RECT rc, COLORREF topColor, COLORREF bottomColor) {
    int height = rc.bottom - rc.top;
    if (height <= 0) return;

    int r1 = GetRValue(topColor);
    int g1 = GetGValue(topColor);
    int b1 = GetBValue(topColor);
    int r2 = GetRValue(bottomColor);
    int g2 = GetGValue(bottomColor);
    int b2 = GetBValue(bottomColor);

    for (int y = 0; y < height; ++y) {
        float t = (float)y / (float)height;
        int r = (int)(r1 + (r2 - r1) * t);
        int g = (int)(g1 + (g2 - g1) * t);
        int b = (int)(b1 + (b2 - b1) * t);
        HPEN pen = CreatePen(PS_SOLID, 1, RGB(r, g, b));
        HPEN oldPen = (HPEN)SelectObject(hdc, pen);
        MoveToEx(hdc, rc.left, rc.top + y, NULL);
        LineTo(hdc, rc.right, rc.top + y);
        SelectObject(hdc, oldPen);
        DeleteObject(pen);
    }
}

void LoadScores() {
    FILE *f = fopen(SCORE_FILE, "r");
    if (f) {
        fscanf(f, "%d %d %d", &bestScores[0], &bestScores[1], &bestScores[2]);
        fclose(f);
    }
}

void SaveScore(int mode, int score) {
    int idx = (mode == 8) ? 0 : ((mode == 16) ? 1 : 2);
    if (score < bestScores[idx]) {
        bestScores[idx] = score;
        FILE *f = fopen(SCORE_FILE, "w");
        if (f) {
            fprintf(f, "%d %d %d", bestScores[0], bestScores[1], bestScores[2]);
            fclose(f);
        }
    }
}

void InitGameData(int difficulty, HWND hwnd) {
    numCards = difficulty;
    matchedPairs = 0;
    moves = 0;
    flippedCount = 0;
    firstFlipped = -1;
    secondFlipped = -1;
    gameStarted = false;
    gameOver = false;
    waitFlag = false;
    currentTimeStr = 0;

    timeAttackMode = menuTimeAttackEnabled;
    if (timeAttackMode) {
        // In timed mode, countdown starts as soon as the game screen opens.
        gameStarted = true;
        gameStartTime = GetTickCount();
    }

    int cols = (numCards == 8) ? 4 : ((numCards == 16) ? 4 : 6);
    int rows = numCards / cols;
    int cellWidth = 80;
    int cellHeight = 80;
    int padding = 10;
    
    RECT rcClient;
    GetClientRect(hwnd, &rcClient);
    
    int startX = (rcClient.right - rcClient.left - (cols * cellWidth + (cols - 1) * padding)) / 2;
    if(startX < 0) startX = 20;
    int startY = 160;

    int pairs[12];
    for (int i = 0; i < numCards / 2; i++) {
        pairs[i] = i;
    }

    int cIndex = 0;
    for (int i = 0; i < numCards / 2; i++) {
        for (int j = 0; j < 2; j++) {
            cards[cIndex].id = pairs[i];
            cards[cIndex].isFlipped = false;
            cards[cIndex].isMatched = false;
            cards[cIndex].color = cardColors[pairs[i] % 12];
            strcpy(cards[cIndex].text, cardSymbols[pairs[i] % 12]);
            
            // Back side visible at start
            cards[cIndex].animScale = -1.0f;
            cards[cIndex].targetScale = -1.0f;
            cards[cIndex].isAnimating = false;
            cIndex++;
        }
    }

    // Shuffle
    for (int i = numCards - 1; i > 0; i--) {
        int j = rand() % (i + 1);
        Card temp = cards[i];
        cards[i] = cards[j];
        cards[j] = temp;
    }

    for (int i = 0; i < numCards; i++) {
        int r = i / cols;
        int c = i % cols;
        cards[i].rect.left = startX + c * (cellWidth + padding);
        cards[i].rect.top = startY + r * (cellHeight + padding);
        cards[i].rect.right = cards[i].rect.left + cellWidth;
        cards[i].rect.bottom = cards[i].rect.top + cellHeight;
    }

    InvalidateRect(hwnd, NULL, TRUE);
}

void StartFlipAnimation(int cardIndex, bool showFace) {
    cards[cardIndex].isAnimating = true;
    cards[cardIndex].isFlipped = showFace;
    cards[cardIndex].targetScale = showFace ? 1.0f : -1.0f;
}

LRESULT CALLBACK WindowProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam) {
    switch (uMsg) {
        case WM_CREATE: {
            srand((unsigned int)time(NULL));
            LoadScores();
            
            hBtn8 = CreateWindow("BUTTON", "8 Cartes", WS_TABSTOP | WS_VISIBLE | WS_CHILD | BS_DEFPUSHBUTTON,
                50, 90, 90, 30, hwnd, (HMENU)ID_BTN_8, (HINSTANCE)GetWindowLongPtr(hwnd, GWLP_HINSTANCE), NULL);
            hBtn16 = CreateWindow("BUTTON", "16 Cartes", WS_TABSTOP | WS_VISIBLE | WS_CHILD | BS_DEFPUSHBUTTON,
                150, 90, 90, 30, hwnd, (HMENU)ID_BTN_16, (HINSTANCE)GetWindowLongPtr(hwnd, GWLP_HINSTANCE), NULL);
            hBtn24 = CreateWindow("BUTTON", "24 Cartes", WS_TABSTOP | WS_VISIBLE | WS_CHILD | BS_DEFPUSHBUTTON,
                250, 90, 90, 30, hwnd, (HMENU)ID_BTN_24, (HINSTANCE)GetWindowLongPtr(hwnd, GWLP_HINSTANCE), NULL);
            hBtnRestart = CreateWindow("BUTTON", "Rejouer", WS_TABSTOP | WS_VISIBLE | WS_CHILD | BS_DEFPUSHBUTTON,
                450, 90, 90, 30, hwnd, (HMENU)ID_BTN_RESTART, (HINSTANCE)GetWindowLongPtr(hwnd, GWLP_HINSTANCE), NULL);
            hBtnMenu = CreateWindow("BUTTON", "Menu", WS_TABSTOP | WS_VISIBLE | WS_CHILD | BS_DEFPUSHBUTTON,
                550, 90, 90, 30, hwnd, (HMENU)ID_BTN_MENU, (HINSTANCE)GetWindowLongPtr(hwnd, GWLP_HINSTANCE), NULL);
            hChkTime = CreateWindow("BUTTON", "Mode Temps Limite (60s)", WS_VISIBLE | WS_CHILD | BS_AUTOCHECKBOX,
                50, 130, 200, 20, hwnd, (HMENU)ID_CHK_TIME, (HINSTANCE)GetWindowLongPtr(hwnd, GWLP_HINSTANCE), NULL);

            hUiFont = CreateFont(18, 0, 0, 0, FW_SEMIBOLD, FALSE, FALSE, FALSE, DEFAULT_CHARSET,
                OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS, CLEARTYPE_QUALITY, VARIABLE_PITCH, TEXT("Segoe UI"));
            hUiFontSmall = CreateFont(16, 0, 0, 0, FW_NORMAL, FALSE, FALSE, FALSE, DEFAULT_CHARSET,
                OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS, CLEARTYPE_QUALITY, VARIABLE_PITCH, TEXT("Segoe UI"));

            SendMessage(hBtn8, WM_SETFONT, (WPARAM)hUiFontSmall, TRUE);
            SendMessage(hBtn16, WM_SETFONT, (WPARAM)hUiFontSmall, TRUE);
            SendMessage(hBtn24, WM_SETFONT, (WPARAM)hUiFontSmall, TRUE);
            SendMessage(hBtnRestart, WM_SETFONT, (WPARAM)hUiFontSmall, TRUE);
            SendMessage(hBtnMenu, WM_SETFONT, (WPARAM)hUiFontSmall, TRUE);
            SendMessage(hChkTime, WM_SETFONT, (WPARAM)hUiFontSmall, TRUE);
            
            SetTimer(hwnd, TIMER_TICK, 1000, NULL);
            SetTimer(hwnd, TIMER_ANIM, 16, NULL); // ~60 FPS animation
            currentScreen = SCREEN_MENU;
            UpdateMenuLayout(hwnd);
            UpdateControlsVisibility();
            return 0;
        }

        case WM_SIZE: {
            UpdateMenuLayout(hwnd);
            InvalidateRect(hwnd, NULL, TRUE);
            return 0;
        }

        case WM_MOUSEMOVE: {
            if (currentScreen == SCREEN_MENU) {
                POINT pt = { LOWORD(lParam), HIWORD(lParam) };
                int newHoverDifficulty = -1;
                if (PtInRect(&menuDiffRects[0], pt)) newHoverDifficulty = 0;
                if (PtInRect(&menuDiffRects[1], pt)) newHoverDifficulty = 1;
                if (PtInRect(&menuDiffRects[2], pt)) newHoverDifficulty = 2;
                bool newHoverPlay = PtInRect(&menuPlayRect, pt) ? true : false;
                bool newHoverToggle = PtInRect(&menuToggleRect, pt) ? true : false;

                if (newHoverDifficulty != hoverDifficulty || newHoverPlay != hoverPlay || newHoverToggle != hoverToggle) {
                    hoverDifficulty = newHoverDifficulty;
                    hoverPlay = newHoverPlay;
                    hoverToggle = newHoverToggle;
                    InvalidateRect(hwnd, NULL, FALSE);
                }
            }
            return 0;
        }

        case WM_COMMAND: {
            if (LOWORD(wParam) == ID_BTN_8) {
                currentScreen = SCREEN_GAME;
                InitGameData(8, hwnd);
                UpdateControlsVisibility();
            }
            if (LOWORD(wParam) == ID_BTN_16) {
                currentScreen = SCREEN_GAME;
                InitGameData(16, hwnd);
                UpdateControlsVisibility();
            }
            if (LOWORD(wParam) == ID_BTN_24) {
                currentScreen = SCREEN_GAME;
                InitGameData(24, hwnd);
                UpdateControlsVisibility();
            }
            if (LOWORD(wParam) == ID_BTN_RESTART) InitGameData(numCards, hwnd);
            if (LOWORD(wParam) == ID_BTN_MENU) {
                currentScreen = SCREEN_MENU;
                gameStarted = false;
                gameOver = false;
                waitFlag = false;
                UpdateControlsVisibility();
                InvalidateRect(hwnd, NULL, TRUE);
            }
            return 0;
        }

        case WM_LBUTTONDOWN: {
            int xPos = LOWORD(lParam);
            int yPos = HIWORD(lParam);
            POINT pt = { xPos, yPos };

            if (currentScreen == SCREEN_MENU) {
                if (PtInRect(&menuDiffRects[0], pt)) selectedDifficulty = 8;
                if (PtInRect(&menuDiffRects[1], pt)) selectedDifficulty = 16;
                if (PtInRect(&menuDiffRects[2], pt)) selectedDifficulty = 24;

                if (PtInRect(&menuToggleRect, pt)) {
                    menuTimeAttackEnabled = !menuTimeAttackEnabled;
                    MessageBeep(MB_OK);
                }

                if (PtInRect(&menuPlayRect, pt)) {
                    currentScreen = SCREEN_GAME;
                    InitGameData(selectedDifficulty, hwnd);
                    UpdateControlsVisibility();
                    MessageBeep(MB_ICONASTERISK);
                }

                InvalidateRect(hwnd, NULL, TRUE);
                return 0;
            }

            if (waitFlag || gameOver) return 0;

            for (int i = 0; i < numCards; i++) {
                if (PtInRect(&cards[i].rect, pt) && !cards[i].isFlipped && !cards[i].isMatched) {
                    if (!gameStarted) {
                        gameStarted = true;
                        gameStartTime = GetTickCount();
                    }
                    
                    StartFlipAnimation(i, true); // True = show face
                    flippedCount++;
                    MessageBeep(MB_OK); // Sound effect on flip

                    if (flippedCount == 1) {
                        firstFlipped = i;
                    } else if (flippedCount == 2) {
                        secondFlipped = i;
                        moves++;
                        waitFlag = true;
                        SetTimer(hwnd, TIMER_FLIP_BACK, 1000, NULL);
                    }
                    break;
                }
            }
            return 0;
        }

        case WM_TIMER: {
            if (wParam == TIMER_FLIP_BACK && waitFlag) {
                KillTimer(hwnd, TIMER_FLIP_BACK);
                if (cards[firstFlipped].id == cards[secondFlipped].id) {
                    cards[firstFlipped].isMatched = true;
                    cards[secondFlipped].isMatched = true;
                    matchedPairs++;
                    MessageBeep(MB_ICONASTERISK); // Sound effect match
                    
                    if (matchedPairs == numCards / 2) {
                        gameOver = true;
                        SaveScore(numCards, moves);
                        MessageBeep(MB_ICONHAND); // Win sound Let's use asterisk as it's nicer
                        InvalidateRect(hwnd, NULL, TRUE);
                    }
                } else {
                    StartFlipAnimation(firstFlipped, false);
                    StartFlipAnimation(secondFlipped, false);
                    MessageBeep(MB_ICONEXCLAMATION); // Sound effect mismatch
                }
                flippedCount = 0;
                firstFlipped = -1;
                secondFlipped = -1;
                waitFlag = false;
            } else if (wParam == TIMER_TICK) {
                if (currentScreen == SCREEN_GAME && ((gameStarted || timeAttackMode) && !gameOver)) {
                    DWORD diff = GetTickCount() - gameStartTime;
                    currentTimeStr = diff;
                    
                    if (timeAttackMode && diff / 1000 >= timeLimit) {
                        gameOver = true;
                        MessageBeep(MB_ICONHAND); // Lose sound
                        MessageBox(hwnd, "Temps ecoule ! Game Over.", "Defaite", MB_OK);
                    }

                    // Redraw the full HUD panel so timer text always visually updates.
                    RECT statRect = { 20, 20, 740, 160 };
                    InvalidateRect(hwnd, &statRect, TRUE);
                }
            } else if (wParam == TIMER_ANIM) {
                DWORD tick = GetTickCount();
                uiPulse = (float)(sin((double)tick / 340.0) * 0.5 + 0.5);
                bool needsRedraw = false;
                for (int i = 0; i < numCards; ++i) {
                    if (cards[i].isAnimating) {
                        // Interpolate animation scale
                        float diff = cards[i].targetScale - cards[i].animScale;
                        cards[i].animScale += diff * 0.2f; // Animation speed
                        
                        if (fabs(diff) < 0.05f) {
                            cards[i].animScale = cards[i].targetScale;
                            cards[i].isAnimating = false;
                        }
                        RECT cr = cards[i].rect;
                        cr.left -= 5; cr.right += 5; cr.top -= 5; cr.bottom += 5;
                        InvalidateRect(hwnd, &cr, FALSE);
                        needsRedraw = true;
                    }
                }
                if (currentScreen == SCREEN_MENU && (hoverDifficulty >= 0 || hoverPlay || hoverToggle)) {
                    needsRedraw = true;
                }
                if (needsRedraw && currentScreen == SCREEN_MENU) {
                    InvalidateRect(hwnd, NULL, FALSE);
                }
            }
            return 0;
        }

        case WM_PAINT: {
            PAINTSTRUCT ps;
            HDC hdc = BeginPaint(hwnd, &ps);
            
            // Background buffer for double buffering to reduce flicker
            RECT rcClient;
            GetClientRect(hwnd, &rcClient);
            HDC hdcMem = CreateCompatibleDC(hdc);
            HBITMAP hbmMem = CreateCompatibleBitmap(hdc, rcClient.right, rcClient.bottom);
            HBITMAP hbmOld = SelectObject(hdcMem, hbmMem);

            FillVerticalGradient(hdcMem, rcClient, RGB(24, 30, 54), RGB(10, 12, 24));

            HBRUSH blobBrush1 = CreateSolidBrush(RGB(38, 61, 109));
            HBRUSH blobOld = (HBRUSH)SelectObject(hdcMem, blobBrush1);
            Ellipse(hdcMem, -120, -70, 260, 220);
            SelectObject(hdcMem, blobOld);
            DeleteObject(blobBrush1);

            HBRUSH blobBrush2 = CreateSolidBrush(RGB(81, 40, 114));
            blobOld = (HBRUSH)SelectObject(hdcMem, blobBrush2);
            Ellipse(hdcMem, rcClient.right - 240, -100, rcClient.right + 120, 170);
            SelectObject(hdcMem, blobOld);
            DeleteObject(blobBrush2);

            SetBkMode(hdcMem, TRANSPARENT);
            SetTextColor(hdcMem, RGB(255, 255, 255));

            if (currentScreen == SCREEN_MENU) {
                HFONT hLogoFont = CreateFont(28, 0, 0, 0, FW_BOLD, FALSE, FALSE, FALSE, DEFAULT_CHARSET,
                    OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS, CLEARTYPE_QUALITY, VARIABLE_PITCH, TEXT("Segoe UI"));
                HFONT hMenuTitle = CreateFont(40, 0, 0, 0, FW_BOLD, FALSE, FALSE, FALSE, DEFAULT_CHARSET,
                    OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS, CLEARTYPE_QUALITY, VARIABLE_PITCH, TEXT("Segoe UI"));
                HFONT hMenuSub = CreateFont(22, 0, 0, 0, FW_NORMAL, FALSE, FALSE, FALSE, DEFAULT_CHARSET,
                    OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS, CLEARTYPE_QUALITY, VARIABLE_PITCH, TEXT("Segoe UI"));
                HFONT hMenuCardTitle = CreateFont(24, 0, 0, 0, FW_BOLD, FALSE, FALSE, FALSE, DEFAULT_CHARSET,
                    OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS, CLEARTYPE_QUALITY, VARIABLE_PITCH, TEXT("Segoe UI"));
                HFONT hMenuCardBody = CreateFont(17, 0, 0, 0, FW_SEMIBOLD, FALSE, FALSE, FALSE, DEFAULT_CHARSET,
                    OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS, CLEARTYPE_QUALITY, VARIABLE_PITCH, TEXT("Segoe UI"));

                SelectObject(hdcMem, hLogoFont);
                SetTextColor(hdcMem, RGB(225, 236, 255));
                TextOut(hdcMem, 42, 38, "JEU MEMOIRE", 11);
                SetTextColor(hdcMem, RGB(255, 217, 128));
                TextOut(hdcMem, 42, 72, "Edition Deluxe", 13);

                HBRUSH menuBrush = CreateSolidBrush(RGB(18, 23, 40));
                HBRUSH oldMenuBrush = (HBRUSH)SelectObject(hdcMem, menuBrush);
                HPEN menuPen = CreatePen(PS_SOLID, 2, RGB(88, 116, 188));
                HPEN oldMenuPen = (HPEN)SelectObject(hdcMem, menuPen);
                RoundRect(hdcMem, menuPanelRect.left, menuPanelRect.top, menuPanelRect.right, menuPanelRect.bottom, 22, 22);
                SelectObject(hdcMem, oldMenuPen);
                SelectObject(hdcMem, oldMenuBrush);
                DeleteObject(menuBrush);
                DeleteObject(menuPen);

                RECT glowRect = menuPanelRect;
                glowRect.left -= 4;
                glowRect.top -= 4;
                glowRect.right += 4;
                glowRect.bottom += 4;
                HPEN glowPen = CreatePen(PS_SOLID, 1, RGB(90 + (int)(uiPulse * 30.0f), 120 + (int)(uiPulse * 40.0f), 200));
                HPEN oldGlow = (HPEN)SelectObject(hdcMem, glowPen);
                HBRUSH oldGlowBrush = (HBRUSH)SelectObject(hdcMem, GetStockObject(NULL_BRUSH));
                RoundRect(hdcMem, glowRect.left, glowRect.top, glowRect.right, glowRect.bottom, 24, 24);
                SelectObject(hdcMem, oldGlow);
                SelectObject(hdcMem, oldGlowBrush);
                DeleteObject(glowPen);

                SelectObject(hdcMem, hMenuTitle);
                SetTextColor(hdcMem, RGB(235, 242, 255));
                TextOut(hdcMem, menuPanelRect.left + 155, menuPanelRect.top + 26, "Menu de Demarrage", 17);

                SelectObject(hdcMem, hMenuSub);
                SetTextColor(hdcMem, RGB(255, 220, 128));
                TextOut(hdcMem, menuPanelRect.left + 94, menuPanelRect.top + 74, "Choisis une difficulte puis lance la partie", 40);

                int choices[3] = {8, 16, 24};
                for (int i = 0; i < 3; ++i) {
                    bool isSelected = (selectedDifficulty == choices[i]);
                    bool isHovered = (hoverDifficulty == i);
                    HBRUSH diffBrush = CreateSolidBrush(
                        isSelected ? RGB(57, 90, 168) : (isHovered ? RGB(43, 57, 96) : RGB(31, 40, 68))
                    );
                    HPEN diffPen = CreatePen(
                        PS_SOLID,
                        isSelected ? 3 : 1,
                        isSelected ? RGB(255, 219, 120) : (isHovered ? RGB(150, 182, 255) : RGB(95, 114, 172))
                    );
                    HBRUSH oldDiffBrush = (HBRUSH)SelectObject(hdcMem, diffBrush);
                    HPEN oldDiffPen = (HPEN)SelectObject(hdcMem, diffPen);
                    RoundRect(hdcMem, menuDiffRects[i].left, menuDiffRects[i].top, menuDiffRects[i].right, menuDiffRects[i].bottom, 16, 16);
                    SelectObject(hdcMem, oldDiffPen);
                    SelectObject(hdcMem, oldDiffBrush);
                    DeleteObject(diffBrush);
                    DeleteObject(diffPen);

                    char label[20];
                    sprintf(label, "%d Cartes", choices[i]);
                    SelectObject(hdcMem, hMenuCardTitle);
                    SetTextColor(hdcMem, RGB(236, 245, 255));
                    RECT lr = menuDiffRects[i];
                    lr.top += 14;
                    DrawText(hdcMem, label, -1, &lr, DT_CENTER | DT_TOP | DT_SINGLELINE);

                    int idx = i;
                    char rec[32];
                    if (bestScores[idx] == 999) sprintf(rec, "Record: --");
                    else sprintf(rec, "Record: %d", bestScores[idx]);
                    SelectObject(hdcMem, hMenuCardBody);
                    SetTextColor(hdcMem, RGB(255, 227, 124));
                    RECT rr = menuDiffRects[i];
                    rr.top += 54;
                    DrawText(hdcMem, rec, -1, &rr, DT_CENTER | DT_TOP | DT_SINGLELINE);
                }

                HBRUSH togBrush = CreateSolidBrush(menuTimeAttackEnabled ? RGB(45, 112, 79) : RGB(49, 57, 84));
                HPEN togPen = CreatePen(PS_SOLID, hoverToggle ? 2 : 1, hoverToggle ? RGB(170, 197, 255) : RGB(115, 134, 186));
                HBRUSH oldTogBrush = (HBRUSH)SelectObject(hdcMem, togBrush);
                HPEN oldTogPen = (HPEN)SelectObject(hdcMem, togPen);
                RoundRect(hdcMem, menuToggleRect.left, menuToggleRect.top, menuToggleRect.right, menuToggleRect.bottom, 12, 12);
                SelectObject(hdcMem, oldTogPen);
                SelectObject(hdcMem, oldTogBrush);
                DeleteObject(togBrush);
                DeleteObject(togPen);

                SelectObject(hdcMem, hMenuCardBody);
                SetTextColor(hdcMem, RGB(230, 240, 255));
                TextOut(hdcMem, menuToggleRect.left + 16, menuToggleRect.top + 10, "Mode 60s", 8);
                SetTextColor(hdcMem, menuTimeAttackEnabled ? RGB(128, 255, 176) : RGB(173, 186, 219));
                TextOut(hdcMem, menuToggleRect.left + 120, menuToggleRect.top + 10, menuTimeAttackEnabled ? "ON" : "OFF", 3);

                HBRUSH playBrush = CreateSolidBrush(hoverPlay ? RGB(246, 106, 64) : RGB(228, 88, 51));
                HPEN playPen = CreatePen(PS_SOLID, hoverPlay ? 2 : 1, RGB(255, 189, 126));
                HBRUSH oldPlayBrush = (HBRUSH)SelectObject(hdcMem, playBrush);
                HPEN oldPlayPen = (HPEN)SelectObject(hdcMem, playPen);
                RoundRect(hdcMem, menuPlayRect.left, menuPlayRect.top, menuPlayRect.right, menuPlayRect.bottom, 14, 14);
                SelectObject(hdcMem, oldPlayPen);
                SelectObject(hdcMem, oldPlayBrush);
                DeleteObject(playBrush);
                DeleteObject(playPen);

                SelectObject(hdcMem, hMenuCardTitle);
                SetTextColor(hdcMem, RGB(255, 248, 240));
                RECT playTextRect = menuPlayRect;
                DrawText(hdcMem, "JOUER", -1, &playTextRect, DT_CENTER | DT_VCENTER | DT_SINGLELINE);

                SetTextColor(hdcMem, RGB(157, 175, 220));
                TextOut(hdcMem, menuPanelRect.left + 35, menuPanelRect.top + 325, "Astuce: termine avec le moins de coups possible pour battre ton record.", 66);

                DeleteObject(hLogoFont);
                DeleteObject(hMenuTitle);
                DeleteObject(hMenuSub);
                DeleteObject(hMenuCardTitle);
                DeleteObject(hMenuCardBody);

                BitBlt(hdc, 0, 0, rcClient.right, rcClient.bottom, hdcMem, 0, 0, SRCCOPY);
                SelectObject(hdcMem, hbmOld);
                DeleteObject(hbmMem);
                DeleteDC(hdcMem);
                EndPaint(hwnd, &ps);
                return 0;
            }

            RECT panelRect = { 26, 22, rcClient.right - 26, 150 };
            HBRUSH panelBrush = CreateSolidBrush(RGB(22, 28, 46));
            HBRUSH oldPanelBrush = (HBRUSH)SelectObject(hdcMem, panelBrush);
            HPEN panelPen = CreatePen(PS_SOLID, 1, RGB(76, 94, 150));
            HPEN oldPanelPen = (HPEN)SelectObject(hdcMem, panelPen);
            RoundRect(hdcMem, panelRect.left, panelRect.top, panelRect.right, panelRect.bottom, 18, 18);
            SelectObject(hdcMem, oldPanelPen);
            SelectObject(hdcMem, oldPanelBrush);
            DeleteObject(panelBrush);
            DeleteObject(panelPen);
            
            HFONT hTitleFont = CreateFont(28, 0, 0, 0, FW_BOLD, FALSE, FALSE, FALSE, DEFAULT_CHARSET, OUT_DEFAULT_PRECIS,
                CLIP_DEFAULT_PRECIS, CLEARTYPE_QUALITY, VARIABLE_PITCH, TEXT("Segoe UI"));
            SelectObject(hdcMem, hTitleFont);
            TextOut(hdcMem, 48, 40, "Jeu de Memoire - Deluxe", 23);

            HFONT hStatFont = CreateFont(20, 0, 0, 0, FW_BOLD, FALSE, FALSE, FALSE, DEFAULT_CHARSET, OUT_DEFAULT_PRECIS,
                CLIP_DEFAULT_PRECIS, CLEARTYPE_QUALITY, VARIABLE_PITCH, TEXT("Segoe UI"));
            SelectObject(hdcMem, hStatFont);

            int secs = (currentTimeStr / 1000);
            if (timeAttackMode) {
                secs = timeLimit - secs;
                if (secs < 0) secs = 0;
            }
            
            char statsStr[200];
            int idx = (numCards == 8) ? 0 : ((numCards == 16) ? 1 : 2);
            int record = bestScores[idx];
            char recordStr[20] = "--";
            if (record != 999) sprintf(recordStr, "%d", record);

            sprintf(statsStr, "Temps: %02d:%02d   Coups: %d   |  Record: %s coups", 
                secs / 60, secs % 60, moves, recordStr);
                
            SetTextColor(hdcMem, RGB(255, 227, 124));
            TextOut(hdcMem, 48, 82, statsStr, strlen(statsStr));

            HBRUSH backBrush = CreateSolidBrush(RGB(65, 90, 165));
            HPEN borderPen = CreatePen(PS_SOLID, 2, RGB(17, 20, 32));
            HPEN matchedPen = CreatePen(PS_SOLID, 3, RGB(255, 215, 120));

            HFONT hCardFont = CreateFont(40, 0, 0, 0, FW_BOLD, FALSE, FALSE, FALSE, DEFAULT_CHARSET, OUT_DEFAULT_PRECIS,
                CLIP_DEFAULT_PRECIS, CLEARTYPE_QUALITY, VARIABLE_PITCH, TEXT("Impact"));

            for (int i = 0; i < numCards; i++) {
                int cx = (cards[i].rect.left + cards[i].rect.right) / 2;
                int hw = (cards[i].rect.right - cards[i].rect.left) / 2;
                
                // Absolute value of animScale determines the current width
                int currentHw = (int)(hw * fabs(cards[i].animScale));
                
                RECT drawRect = { cx - currentHw, cards[i].rect.top, cx + currentHw, cards[i].rect.bottom };

                RECT shadowRect = { drawRect.left + 3, drawRect.top + 4, drawRect.right + 3, drawRect.bottom + 4 };
                HBRUSH shadowBrush = CreateSolidBrush(RGB(8, 10, 18));
                HBRUSH oldShadow = (HBRUSH)SelectObject(hdcMem, shadowBrush);
                HPEN shadowPen = CreatePen(PS_SOLID, 1, RGB(8, 10, 18));
                HPEN oldShadowPen = (HPEN)SelectObject(hdcMem, shadowPen);
                RoundRect(hdcMem, shadowRect.left, shadowRect.top, shadowRect.right, shadowRect.bottom, 14, 14);
                SelectObject(hdcMem, oldShadowPen);
                SelectObject(hdcMem, oldShadow);
                DeleteObject(shadowPen);
                DeleteObject(shadowBrush);

                SelectObject(hdcMem, cards[i].isMatched ? matchedPen : borderPen);
                
                bool showingFace = cards[i].isFlipped || cards[i].isMatched;

                if (cards[i].isMatched || showingFace) {
                    HBRUSH faceBrush = CreateSolidBrush(cards[i].color);
                    SelectObject(hdcMem, faceBrush);
                    RoundRect(hdcMem, drawRect.left, drawRect.top, drawRect.right, drawRect.bottom, 15, 15);
                    DeleteObject(faceBrush);

                    if (currentHw > hw / 2) {
                        HPEN hiPen = CreatePen(PS_SOLID, 1, RGB(255, 255, 255));
                        HPEN oldHi = (HPEN)SelectObject(hdcMem, hiPen);
                        MoveToEx(hdcMem, drawRect.left + 10, drawRect.top + 8, NULL);
                        LineTo(hdcMem, drawRect.right - 10, drawRect.top + 8);
                        SelectObject(hdcMem, oldHi);
                        DeleteObject(hiPen);
                    }

                    if (currentHw > hw / 3) { // Only draw text if wide enough to not look squished
                        SelectObject(hdcMem, hCardFont);
                        SetTextColor(hdcMem, RGB(255, 255, 255));
                        RECT textRect = drawRect;
                        DrawText(hdcMem, cards[i].text, -1, &textRect, DT_SINGLELINE | DT_CENTER | DT_VCENTER);
                    }
                } else {
                    SelectObject(hdcMem, backBrush);
                    RoundRect(hdcMem, drawRect.left, drawRect.top, drawRect.right, drawRect.bottom, 15, 15);
                    // Draw a subtle pattern on back
                    if (currentHw > hw / 2) {
                        MoveToEx(hdcMem, drawRect.left + 10, drawRect.top + 10, NULL);
                        LineTo(hdcMem, drawRect.right - 10, drawRect.bottom - 10);
                        MoveToEx(hdcMem, drawRect.left + 10, drawRect.bottom - 10, NULL);
                        LineTo(hdcMem, drawRect.right - 10, drawRect.top + 10);
                    }
                }
            }

            if (gameOver && matchedPairs == numCards / 2) {
                RECT winRect = { 110, 210, rcClient.right - 110, 360 };
                HBRUSH winBrush = CreateSolidBrush(RGB(14, 22, 40));
                HBRUSH oldWinBrush = (HBRUSH)SelectObject(hdcMem, winBrush);
                HPEN winPen = CreatePen(PS_SOLID, 2, RGB(120, 203, 150));
                HPEN oldWinPen = (HPEN)SelectObject(hdcMem, winPen);
                RoundRect(hdcMem, winRect.left, winRect.top, winRect.right, winRect.bottom, 18, 18);
                SelectObject(hdcMem, oldWinPen);
                SelectObject(hdcMem, oldWinBrush);
                DeleteObject(winBrush);
                DeleteObject(winPen);

                SetTextColor(hdcMem, RGB(116, 250, 166));
                SelectObject(hdcMem, hTitleFont);
                TextOut(hdcMem, 210, 238, "Victoire !", 10);

                HFONT hWinFont = CreateFont(18, 0, 0, 0, FW_SEMIBOLD, FALSE, FALSE, FALSE, DEFAULT_CHARSET,
                    OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS, CLEARTYPE_QUALITY, VARIABLE_PITCH, TEXT("Segoe UI"));
                SelectObject(hdcMem, hWinFont);
                SetTextColor(hdcMem, RGB(230, 235, 255));
                TextOut(hdcMem, 172, 286, "Excellent ! Cliquez sur Rejouer pour continuer.", 45);
                DeleteObject(hWinFont);
            }

            // Blit buffer to screen
            BitBlt(hdc, 0, 0, rcClient.right, rcClient.bottom, hdcMem, 0, 0, SRCCOPY);

            // Cleanup
            DeleteObject(hTitleFont);
            DeleteObject(hStatFont);
            DeleteObject(hCardFont);
            DeleteObject(backBrush);
            DeleteObject(borderPen);
            DeleteObject(matchedPen);
            SelectObject(hdcMem, hbmOld);
            DeleteObject(hbmMem);
            DeleteDC(hdcMem);

            EndPaint(hwnd, &ps);
            return 0;
        }

        case WM_CTLCOLORSTATIC: {
            HDC hdcStatic = (HDC)wParam;
            SetBkColor(hdcStatic, RGB(40, 44, 52));
            SetTextColor(hdcStatic, RGB(255, 255, 255));
            return (LRESULT)GetStockObject(NULL_BRUSH);
        }

        case WM_DESTROY: {
            if (hUiFont) DeleteObject(hUiFont);
            if (hUiFontSmall) DeleteObject(hUiFontSmall);
            PostQuitMessage(0);
            return 0;
        }
    }
    return DefWindowProc(hwnd, uMsg, wParam, lParam);
}

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR pCmdLine, int nCmdShow) {
    const char CLASS_NAME[]  = "JeuMemoireDeluxe";
    
    WNDCLASS wc = {0};
    wc.lpfnWndProc   = WindowProc;
    wc.hInstance     = hInstance;
    wc.lpszClassName = CLASS_NAME;
    wc.hCursor       = LoadCursor(NULL, IDC_ARROW);
    wc.hbrBackground = (HBRUSH)CreateSolidBrush(RGB(40, 44, 52)); // Dark theme

    RegisterClass(&wc);

    hwndMain = CreateWindowEx(
        0, CLASS_NAME, "Jeu de Memoire - Deluxe Edition (Win32)", WS_OVERLAPPEDWINDOW ^ WS_THICKFRAME ^ WS_MAXIMIZEBOX,
        CW_USEDEFAULT, CW_USEDEFAULT, 760, 760,
        NULL, NULL, hInstance, NULL
    );

    if (hwndMain == NULL) {
        return 0;
    }

    ShowWindow(hwndMain, nCmdShow);

    MSG msg = {0};
    while (GetMessage(&msg, NULL, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }

    return 0;
}