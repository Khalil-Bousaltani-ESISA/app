#include <windows.h>
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <stdbool.h>

#define MAX_CARDS 24
#define ID_BTN_8 1001
#define ID_BTN_16 1002
#define ID_BTN_24 1003
#define ID_BTN_RESTART 1004
#define TIMER_FLIP_BACK 1

typedef struct {
    int id;
    bool isFlipped;
    bool isMatched;
    RECT rect;
    COLORREF color;
} Card;

Card cards[MAX_CARDS];
int numCards = 16;
int flippedCount = 0;
int firstFlipped = -1;
int secondFlipped = -1;
int matchedPairs = 0;
int moves = 0;
DWORD gameStartTime = 0;
DWORD currentTime = 0;  // in milliseconds
bool gameStarted = false;
bool gameOver = false;
bool waitFlag = false;

COLORREF cardColors[] = {
    RGB(255, 0, 0),     // Red
    RGB(0, 0, 255),     // Blue
    RGB(0, 255, 0),     // Green
    RGB(255, 255, 0),   // Yellow
    RGB(128, 0, 128),   // Purple
    RGB(255, 165, 0),   // Orange
    RGB(255, 0, 255),   // Magenta
    RGB(0, 255, 255),   // Cyan
    RGB(255, 192, 203), // Pink
    RGB(173, 216, 230), // Light Blue
    RGB(144, 238, 144), // Light Green
    RGB(165, 42, 42)    // Brown
};

HWND hwndMain;
HWND hBtn8, hBtn16, hBtn24, hBtnRestart;

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
    currentTime = 0;

    int cols = (numCards == 8) ? 4 : ((numCards == 16) ? 4 : 6);
    int rows = numCards / cols;
    int cellWidth = 80;
    int cellHeight = 80;
    int padding = 10;
    
    RECT rcClient;
    GetClientRect(hwnd, &rcClient);
    
    int startX = (rcClient.right - rcClient.left - (cols * cellWidth + (cols - 1) * padding)) / 2;
    if(startX < 0) startX = 20;
    int startY = 150;

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

    // Set positions
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

LRESULT CALLBACK WindowProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam) {
    switch (uMsg) {
        case WM_CREATE: {
            srand((unsigned int)time(NULL));
            hBtn8 = CreateWindow("BUTTON", "8 Cartes", WS_TABSTOP | WS_VISIBLE | WS_CHILD | BS_DEFPUSHBUTTON,
                50, 80, 100, 30, hwnd, (HMENU)ID_BTN_8, (HINSTANCE)GetWindowLongPtr(hwnd, GWLP_HINSTANCE), NULL);
            hBtn16 = CreateWindow("BUTTON", "16 Cartes", WS_TABSTOP | WS_VISIBLE | WS_CHILD | BS_DEFPUSHBUTTON,
                160, 80, 100, 30, hwnd, (HMENU)ID_BTN_16, (HINSTANCE)GetWindowLongPtr(hwnd, GWLP_HINSTANCE), NULL);
            hBtn24 = CreateWindow("BUTTON", "24 Cartes", WS_TABSTOP | WS_VISIBLE | WS_CHILD | BS_DEFPUSHBUTTON,
                270, 80, 100, 30, hwnd, (HMENU)ID_BTN_24, (HINSTANCE)GetWindowLongPtr(hwnd, GWLP_HINSTANCE), NULL);
            hBtnRestart = CreateWindow("BUTTON", "Rejouer", WS_TABSTOP | WS_VISIBLE | WS_CHILD | BS_DEFPUSHBUTTON,
                450, 80, 100, 30, hwnd, (HMENU)ID_BTN_RESTART, (HINSTANCE)GetWindowLongPtr(hwnd, GWLP_HINSTANCE), NULL);
            
            SetTimer(hwnd, 2, 1000, NULL); // Clock timer
            InitGameData(16, hwnd);
            return 0;
        }

        case WM_COMMAND: {
            if (LOWORD(wParam) == ID_BTN_8) InitGameData(8, hwnd);
            if (LOWORD(wParam) == ID_BTN_16) InitGameData(16, hwnd);
            if (LOWORD(wParam) == ID_BTN_24) InitGameData(24, hwnd);
            if (LOWORD(wParam) == ID_BTN_RESTART) InitGameData(numCards, hwnd);
            return 0;
        }

        case WM_LBUTTONDOWN: {
            if (waitFlag || gameOver) return 0;
            
            int xPos = LOWORD(lParam); 
            int yPos = HIWORD(lParam); 
            POINT pt = { xPos, yPos };

            for (int i = 0; i < numCards; i++) {
                if (PtInRect(&cards[i].rect, pt) && !cards[i].isFlipped && !cards[i].isMatched) {
                    if (!gameStarted) {
                        gameStarted = true;
                        gameStartTime = GetTickCount();
                    }
                    
                    cards[i].isFlipped = true;
                    flippedCount++;
                    InvalidateRect(hwnd, &cards[i].rect, TRUE);

                    if (flippedCount == 1) {
                        firstFlipped = i;
                    } else if (flippedCount == 2) {
                        secondFlipped = i;
                        moves++;
                        waitFlag = true;
                        SetTimer(hwnd, TIMER_FLIP_BACK, 800, NULL);
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
                    if (matchedPairs == numCards / 2) {
                        gameOver = true;
                        InvalidateRect(hwnd, NULL, TRUE);
                    }
                } else {
                    cards[firstFlipped].isFlipped = false;
                    cards[secondFlipped].isFlipped = false;
                    InvalidateRect(hwnd, &cards[firstFlipped].rect, TRUE);
                    InvalidateRect(hwnd, &cards[secondFlipped].rect, TRUE);
                }
                flippedCount = 0;
                firstFlipped = -1;
                secondFlipped = -1;
                waitFlag = false;
            } else if (wParam == 2) { // 1 sec clock update
                if(gameStarted && !gameOver) {
                    currentTime = GetTickCount() - gameStartTime;
                    RECT statRect = { 50, 40, 400, 70 };
                    InvalidateRect(hwnd, &statRect, TRUE);
                }
            }
            return 0;
        }

        case WM_PAINT: {
            PAINTSTRUCT ps;
            HDC hdc = BeginPaint(hwnd, &ps);
            
            // Background color dark blue-ish
            RECT rcClient;
            GetClientRect(hwnd, &rcClient);
            HBRUSH bgBrush = CreateSolidBrush(RGB(30, 40, 80));
            FillRect(hdc, &rcClient, bgBrush);
            DeleteObject(bgBrush);

            SetBkMode(hdc, TRANSPARENT);
            SetTextColor(hdc, RGB(255, 255, 255));
            
            HFONT hFont = CreateFont(24, 0, 0, 0, FW_BOLD, FALSE, FALSE, FALSE, DEFAULT_CHARSET, OUT_OUTLINE_PRECIS,
                CLIP_DEFAULT_PRECIS, CLEARTYPE_QUALITY, VARIABLE_PITCH, TEXT("Arial"));
            SelectObject(hdc, hFont);

            TextOut(hdc, 50, 10, "Jeu de Memoire - Win32 C", 24);

            HFONT hFontStats = CreateFont(18, 0, 0, 0, FW_NORMAL, FALSE, FALSE, FALSE, DEFAULT_CHARSET, OUT_OUTLINE_PRECIS,
                CLIP_DEFAULT_PRECIS, CLEARTYPE_QUALITY, VARIABLE_PITCH, TEXT("Arial"));
            SelectObject(hdc, hFontStats);

            char statsStr[100];
            int secs = (currentTime / 1000) % 60;
            int mins = (currentTime / 1000) / 60;
            sprintf(statsStr, "Temps: %02d:%02d   Coups: %d", mins, secs, moves);
            SetTextColor(hdc, RGB(255, 255, 0));
            TextOut(hdc, 50, 45, statsStr, strlen(statsStr));

            HBRUSH unknownBrush = CreateSolidBrush(RGB(135, 206, 235)); // Skyblue
            HPEN borderPen = CreatePen(PS_SOLID, 2, RGB(0, 0, 0));
            SelectObject(hdc, borderPen);

            for (int i = 0; i < numCards; i++) {
                if (cards[i].isMatched || cards[i].isFlipped) {
                    HBRUSH colorBrush = CreateSolidBrush(cards[i].color);
                    SelectObject(hdc, colorBrush);
                    Rectangle(hdc, cards[i].rect.left, cards[i].rect.top, cards[i].rect.right, cards[i].rect.bottom);
                    DeleteObject(colorBrush);
                } else {
                    SelectObject(hdc, unknownBrush);
                    Rectangle(hdc, cards[i].rect.left, cards[i].rect.top, cards[i].rect.right, cards[i].rect.bottom);
                }
            }

            if (gameOver) {
                SetTextColor(hdc, RGB(0, 255, 0));
                SelectObject(hdc, hFont);
                TextOut(hdc, 240, 200, "Victoire !", 10);
                
                char winStr[100];
                sprintf(winStr, "Coups: %d | Temps: %02d:%02d", moves, mins, secs);
                SetTextColor(hdc, RGB(255, 255, 255));
                TextOut(hdc, 180, 230, winStr, strlen(winStr));
            }

            DeleteObject(unknownBrush);
            DeleteObject(borderPen);
            DeleteObject(hFont);
            DeleteObject(hFontStats);

            EndPaint(hwnd, &ps);
            return 0;
        }

        case WM_DESTROY: {
            PostQuitMessage(0);
            return 0;
        }
    }
    return DefWindowProc(hwnd, uMsg, wParam, lParam);
}

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR pCmdLine, int nCmdShow) {
    const char CLASS_NAME[]  = "JeuMemoireClass";
    
    WNDCLASS wc = {0};
    wc.lpfnWndProc   = WindowProc;
    wc.hInstance     = hInstance;
    wc.lpszClassName = CLASS_NAME;
    wc.hCursor       = LoadCursor(NULL, IDC_ARROW);

    RegisterClass(&wc);

    hwndMain = CreateWindowEx(
        0, CLASS_NAME, "Jeu de Memoire - C", WS_OVERLAPPEDWINDOW ^ WS_THICKFRAME ^ WS_MAXIMIZEBOX,
        CW_USEDEFAULT, CW_USEDEFAULT, 600, 600,
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