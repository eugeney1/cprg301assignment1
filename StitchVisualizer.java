import java.awt.BasicStroke;
import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.FlowLayout;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.Point;
import java.awt.Toolkit;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.KeyEvent;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.awt.event.MouseWheelEvent;
import java.io.FileInputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import javax.swing.AbstractAction;
import javax.swing.ActionMap;
import javax.swing.InputMap;
import javax.swing.JButton;
import javax.swing.JColorChooser;
import javax.swing.JFrame;
import javax.swing.JPanel;
import javax.swing.KeyStroke;
import javax.swing.Timer;

public class StitchVisualizer extends JPanel {
    private static final int WINDOW_WIDTH = 800;
    private static final int WINDOW_HEIGHT = 600;
    private static final double ZOOM_FACTOR = 1.1;
    private static final int ANIMATION_DELAY = 1; // milliseconds

    private List<Polyline> polylines = new ArrayList<>();
    private List<StitchAction> actions = new ArrayList<>();
    private int currentActionIndex;
    private Timer animationTimer;
    private Color backgroundColor = Color.WHITE;
    private String[] colors = {
            "white", "black", "gray", "blue", "yellow",
            "red", "orange", "purple", "green", "brown",
            "beige", "pink"
    };
    private DrawingPanel drawingPanel;

    private void skipToNextColor() {
        for (int i = currentActionIndex + 1; i < actions.size(); i++) {
            if (actions.get(i).type == StitchAction.Type.JUMP) {
                currentActionIndex = i;
                repaint();
                return;
            }
        }
        // If no more JUMP actions are found, go to the end
        currentActionIndex = actions.size() - 1;
        repaint();
    }

    public StitchVisualizer() {
        loadStitchData("mona-lisa11.dsb", new int[] { 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 2, 3, 4 });

        // Build actions for animation
        for (Polyline polyline : polylines) {
            double[] start = polyline.points.get(0);
            actions.add(new StitchAction(StitchAction.Type.JUMP, start, null));
            for (int i = 1; i < polyline.points.size(); i++) {
                double[] point = polyline.points.get(i);
                actions.add(new StitchAction(StitchAction.Type.DRAW, point, polyline.color));
            }
        }
        currentActionIndex = actions.size() - 1; // Show full design initially

        // Set up animation timer
        animationTimer = new Timer(ANIMATION_DELAY, new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                if (currentActionIndex < actions.size() - 1) {
                    currentActionIndex++;
                    repaint();
                } else {
                    animationTimer.stop();
                }
            }
        });

        // Set up UI
        setLayout(new BorderLayout());
        drawingPanel = new DrawingPanel();
        add(drawingPanel, BorderLayout.CENTER);

        JPanel buttonPanel = new JPanel(new FlowLayout());

        // Start Animation Button
        JButton startButton = new JButton("Start Animation");
        startButton.addActionListener(new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                currentActionIndex = 0;
                animationTimer.start();
            }
        });

        // Fast Forward Button
        JButton fastForwardButton = new JButton("Fast Forward");
        fastForwardButton.addActionListener(new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                animationTimer.stop();
                currentActionIndex = actions.size() - 1;
                repaint();
            }
        });

        // Change Background Color Button
        JButton colorButton = new JButton("Change Background Color");
        colorButton.addActionListener(new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                Color newColor = JColorChooser.showDialog(StitchVisualizer.this, "Choose Background Color",
                        backgroundColor);
                if (newColor != null) {
                    backgroundColor = newColor;
                    repaint();
                }
            }
        });

        JButton skipButton = new JButton("Skip to Next Color");
        skipButton.addActionListener(new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                skipToNextColor();
            }
        });

        buttonPanel.add(startButton);
        buttonPanel.add(fastForwardButton);
        buttonPanel.add(colorButton);
        buttonPanel.add(skipButton);
        add(buttonPanel, BorderLayout.SOUTH);

        // Set up key bindings on the main panel
        InputMap inputMap = getInputMap(WHEN_IN_FOCUSED_WINDOW);
        ActionMap actionMap = getActionMap();
        inputMap.put(KeyStroke.getKeyStroke(KeyEvent.VK_EQUALS, Toolkit.getDefaultToolkit().getMenuShortcutKeyMaskEx()),
                "zoomIn");
        actionMap.put("zoomIn", new AbstractAction() {
            @Override
            public void actionPerformed(ActionEvent e) {
                drawingPanel.scale *= ZOOM_FACTOR;
                repaint();
            }
        });
        inputMap.put(KeyStroke.getKeyStroke(KeyEvent.VK_MINUS, Toolkit.getDefaultToolkit().getMenuShortcutKeyMaskEx()),
                "zoomOut");
        actionMap.put("zoomOut", new AbstractAction() {
            @Override
            public void actionPerformed(ActionEvent e) {
                drawingPanel.scale /= ZOOM_FACTOR;
                repaint();
            }
        });
    }

    // Inner class for the drawing area
    private class DrawingPanel extends JPanel {
        private double translateX = 0;
        private double translateY = 0;
        private double scale = 1.0;
        private Point lastMousePoint;

        public DrawingPanel() {
            // Mouse wheel for zoom
            addMouseWheelListener(new MouseAdapter() {
                @Override
                public void mouseWheelMoved(MouseWheelEvent e) {
                    double zoom = e.getWheelRotation() < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
                    scale *= zoom;
                    repaint();
                }
            });

            // Mouse drag for pan
            addMouseListener(new MouseAdapter() {
                @Override
                public void mousePressed(MouseEvent e) {
                    lastMousePoint = e.getPoint();
                }
            });
            addMouseMotionListener(new MouseAdapter() {
                @Override
                public void mouseDragged(MouseEvent e) {
                    if (lastMousePoint != null) {
                        translateX += e.getX() - lastMousePoint.x;
                        translateY += e.getY() - lastMousePoint.y;
                        lastMousePoint = e.getPoint();
                        repaint();
                    }
                }
            });
        }

        @Override
        protected void paintComponent(Graphics g) {
            super.paintComponent(g);
            Graphics2D g2d = (Graphics2D) g;
            g2d.setColor(backgroundColor);
            g2d.fillRect(0, 0, getWidth(), getHeight());

            g2d.translate(translateX, translateY);
            g2d.scale(scale, scale);

            double[] needlePosition = null;
            for (int i = 0; i <= currentActionIndex && i < actions.size(); i++) {
                StitchAction action = actions.get(i);
                if (action.type == StitchAction.Type.JUMP) {
                    needlePosition = action.point;
                } else if (action.type == StitchAction.Type.DRAW) {
                    if (needlePosition != null) {
                        g2d.setColor(getAWTColor(action.color));
                        g2d.setStroke(new BasicStroke((float) (1 / scale)));
                        g2d.drawLine((int) needlePosition[0], (int) needlePosition[1],
                                (int) action.point[0], (int) action.point[1]);
                    }
                    needlePosition = action.point;
                }
            }

            // Draw needle position
            if (needlePosition != null) {
                g2d.setColor(Color.RED);
                int radius = 2; // Size in stitch coordinates
                g2d.fillOval((int) (needlePosition[0] - radius), (int) (needlePosition[1] - radius),
                        2 * radius, 2 * radius);
            }
        }
    }

    private Color getAWTColor(String colorName) {
        switch (colorName.toLowerCase()) {
            case "white":
                return Color.WHITE;
            case "black":
                return Color.BLACK;
            case "gray":
                return Color.GRAY;
            case "blue":
                return Color.BLUE;
            case "yellow":
                return Color.YELLOW;
            case "red":
                return Color.RED;
            case "orange":
                return Color.ORANGE;
            case "purple":
                return new Color(128, 0, 128);
            case "green":
                return Color.GREEN;
            case "brown":
                return new Color(165, 42, 42);
            case "beige":
                return new Color(245, 245, 220);
            case "pink":
                return Color.PINK;
            default:
                return Color.BLACK;
        }
    }

    private void loadStitchData(String filePath, int[] colorOrder) {
        try (FileInputStream fis = new FileInputStream(filePath)) {
            fis.skip(512); // Skip header

            int currentX = 0;
            int currentY = 0;
            int colorIndex = 0;
            String currentColor = colors[colorOrder[colorIndex]];
            List<double[]> currentPolyline = new ArrayList<>();
            currentPolyline.add(new double[] { currentX, -currentY });

            byte[] buffer = new byte[3];
            while (fis.read(buffer) == 3) {
                int command = buffer[0] & 0xFF;
                int dy = buffer[1] & 0xFF;
                int dx = buffer[2] & 0xFF;

                // Adjust signs based on command bits
                if ((command & 0x20) != 0)
                    dx = -dx; // Bit 5 sets X sign
                if ((command & 0x40) != 0)
                    dy = -dy; // Bit 6 sets Y sign

                // Calculate new position
                int nextX = currentX + dx;
                int nextY = currentY + dy;

                // Determine command type
                boolean isColorChange = (command & 0x08) != 0;
                boolean isJump = (command & 0x01) != 0;
                String type;
                if (isColorChange) {
                    type = "Color Change";
                } else if (isJump) {
                    type = "Jump";
                } else {
                    type = "Stitch";
                }

                // Print command details with signed X and Y values
                System.out.printf("Type: %s, DX: %d, DY: %d, Position: (%d, %d)\n",
                        type, dx, dy, nextX, nextY);

                // Handle polyline updates
                if (isColorChange) {
                    if (currentPolyline.size() > 1) {
                        polylines.add(new Polyline(currentPolyline, currentColor));
                    }
                    colorIndex = (colorIndex + 1) % colorOrder.length;
                    currentColor = colors[colorOrder[colorIndex]];
                    currentPolyline = new ArrayList<>();
                    currentPolyline.add(new double[] { nextX, -nextY });
                } else if (isJump) {
                    if (currentPolyline.size() > 1) {
                        polylines.add(new Polyline(currentPolyline, currentColor));
                    }
                    currentPolyline = new ArrayList<>();
                    currentPolyline.add(new double[] { nextX, -nextY });
                } else {
                    currentPolyline.add(new double[] { nextX, -nextY });
                }

                // Update current position
                currentX = nextX;
                currentY = nextY;
            }

            // Add the final polyline if it has data
            if (currentPolyline.size() > 1) {
                polylines.add(new Polyline(currentPolyline, currentColor));
            }
        } catch (IOException e) {
            System.err.println("Error reading file: " + e.getMessage());
        }
    }

    private static class StitchAction {
        enum Type {
            JUMP, DRAW
        }

        Type type;
        double[] point;
        String color; // null for JUMP

        StitchAction(Type type, double[] point, String color) {
            this.type = type;
            this.point = point;
            this.color = color;
        }
    }

    private static class Polyline {
        List<double[]> points;
        String color;

        Polyline(List<double[]> points, String color) {
            this.points = new ArrayList<>(points);
            this.color = color;
        }
    }

    public static void main(String[] args) {
        JFrame frame = new JFrame("Stitch Visualizer");
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setSize(WINDOW_WIDTH, WINDOW_HEIGHT);
        StitchVisualizer panel = new StitchVisualizer();
        frame.add(panel);
        frame.setVisible(true);
        panel.requestFocusInWindow();
    }
}